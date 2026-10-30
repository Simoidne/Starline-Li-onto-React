"""Product HTTP integration checks, invoked by integration.py against a disposable DB."""
import base64
import json
import struct
import subprocess
import urllib.error
import urllib.request


def check_products(owner, ops, Client, query, root, private, php):
    for name in ['002_products.sql', '003_product_audit.sql']:
        query((root / 'server/migrations' / name).read_text())
    anon = Client(owner.origin)
    anon.request('products', status=401)
    values = dict(sku='salmon-1', name='Salmon', description='Fresh salmon', category='Fish', unit='kg',
                  public_price_cad='12.50', status='draft', sort_order='0')
    anon.request('product-save', values, status=401)
    owner.request('product-save', values, status=419, headers={'X-CSRF-Token': 'bad'})
    owner.request('product-save', values, status=403, headers={'Origin': 'https://other.example'})
    pid = owner.request('product-save', values)['id']
    values['id'] = pid
    assert anon.request('catalog')['products'] == []
    assert 'csrfToken' not in anon.request('catalog')
    anon.request('product&id=' + pid, status=401)
    owner.request('product-save', dict(values, id=None), status=409)
    costs = dict(id=pid, purchase_currency='USD', purchase_price_per_kg='6.5000', purchased_kg='1000',
                 yield_percent='95', cad_per_purchase_currency='1.37', freight_cad='1200', handling_cad='180',
                 duties_cad='0', other_cad='350', target_price_cad='14')
    saved = ops.request('product-costs', costs)['costs']
    assert saved['landed_cost_cad'] == '10635.00' and saved['cost_per_saleable_kg_cad'] == '11.19'
    assert saved['profit_cad'] == '2665.00' and saved['margin_percent'] == '20.03'
    for field, invalid in [('yield_percent','0'), ('yield_percent','101'), ('purchased_kg','-1'),
                           ('cad_per_purchase_currency','NaN'), ('freight_cad','1.001')]:
        owner.request('product-costs', dict(costs, **{field: invalid}), status=422)
    owner.request('product-costs', dict(costs, purchase_currency='CAD'), status=422)
    # Half-cent rounds up with exact decimal arithmetic, independent of binary floats.
    rounded = owner.request('product-costs', dict(costs, purchase_price_per_kg='0.005', purchased_kg='1',
        yield_percent='100', cad_per_purchase_currency='1', freight_cad='0', handling_cad='0', other_cad='0'))['costs']
    assert rounded['landed_cost_cad'] == '0.01'
    owner.request('product-costs', costs)
    ops.request('product-save', dict(values, status='published'))
    public = anon.request('catalog')['products'][0]
    assert set(public) == {'id','name','description','category','unit','public_price_cad','images'}
    assert public['public_price_cad'] == '12.50'
    assert ops.request('product&id=' + pid)['product']['costs']['landed_cost_cad'] == '10635.00'
    # MIME spoofing and malformed content must fail even with a trusted extension.
    def upload(content, filename='fish.jpg', status=200):
        boundary = 'starline-test-boundary'
        body = (f'--{boundary}\r\nContent-Disposition: form-data; name="id"\r\n\r\n{pid}\r\n'
                f'--{boundary}\r\nContent-Disposition: form-data; name="alt_text"\r\n\r\nSalmon photo\r\n'
                f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{filename}"\r\nContent-Type: image/jpeg\r\n\r\n').encode() + content + f'\r\n--{boundary}--\r\n'.encode()
        return ops.request('product-upload', {}, raw=body, status=status, headers={'Content-Type': 'multipart/form-data; boundary=' + boundary})
    upload(b'<?php echo "unsafe"; ?>', status=422)
    upload(b'x' * (5*1024*1024+1), status=413)
    jpg = subprocess.check_output([php, '-r', '$i=imagecreatetruecolor(10,10);imagejpeg($i);'])
    huge = subprocess.check_output([php, '-r', '$i=imagecreatetruecolor(5001,1);imagejpeg($i);'])
    upload(huge, status=422)
    upload(jpg + b'<?php payload ?>')
    p = owner.request('product&id=' + pid)['product']
    img = p['images'][0]
    second = owner.request('product-save', dict(values, id=None, sku='other-product'))['id']
    owner.request('product-image-delete', dict(id=second, image_id=str(img['id'])), status=404)
    owner.request('product-save', dict(values, id=second, sku='other-product', status='archived'))
    owner.request('product-delete', {'id':second})
    for _ in range(11): upload(jpg)
    upload(jpg, status=422)
    assert len(owner.request('product&id=' + pid)['product']['images']) == 12
    url = owner.origin + img['url']
    with anon.opener.open(url) as response:
        clean = response.read()
        assert response.headers['Content-Type'] == 'image/jpeg'
        assert b'payload' not in clean
    ops.request('product-image-edit', dict(id=pid, image_id=str(img['id']), alt_text='Updated alt', sort_order='2', is_primary=True))
    ops.request('product-save', dict(values, status='draft'))
    try:
        anon.opener.open(url)
        raise AssertionError('Draft photo leaked')
    except urllib.error.HTTPError as e:
        assert e.code == 401
    with ops.opener.open(url) as response: assert response.status == 200
    owner.request('product-image-delete', dict(id=pid,image_id=str(img['id'])))
    remaining = owner.request('product&id=' + pid)['product']['images']
    assert len(remaining) == 11 and sum(int(i['is_primary']) for i in remaining) == 1
    try:
        anon.opener.open(url)
        raise AssertionError('Deleted image remains reachable')
    except urllib.error.HTTPError as e:
        assert e.code == 404
    owner.request('product-delete', {'id':pid}, status=409)
    ops.request('product-save', dict(values, status='archived'))
    assert anon.request('catalog')['products'] == []
    ops.request('product-delete', {'id':pid})
    owner.request('product&id=' + pid, status=404)
    assert int(query('SELECT COUNT(*) FROM starline_product_audit;')) >= 9
    assert query('SELECT COUNT(*) FROM starline_product_costs;') == '0'
    print('PASS: product CRUD, both staff roles, confidential catalog, decimal costing, uploads, draft photos, audit and cascading deletion')

    # Exercise the guarded release migration against legacy data in this disposable DB.
    query("ALTER TABLE starline_admin_users MODIFY role ENUM('owner','operations','sales') NOT NULL;")
    query("INSERT INTO starline_admin_users (email,display_name,role,created_at) VALUES ('legacy@example.com','Legacy','sales',1);")
    release = (root / 'server/release/retire-sales.sql').read_text()
    try:
        query(release)
        raise AssertionError('Migration accepted a legacy account')
    except subprocess.CalledProcessError as e:
        assert 'Resolve legacy role accounts' in e.stderr
    assert query("SELECT COUNT(*) FROM starline_admin_users WHERE role='sales';") == '1'
    query('DROP PROCEDURE starline_retire_sales;')
    query("DELETE FROM starline_admin_users WHERE email='legacy@example.com';")
    query(release)
    assert "'sales'" not in query("SHOW COLUMNS FROM starline_admin_users LIKE 'role';")
    print('PASS: release migration refuses legacy accounts without reassigning/deleting them and succeeds after explicit resolution')
