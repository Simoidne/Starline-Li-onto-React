<?php
declare(strict_types=1);

final class Products
{
    public function __construct(private PDO $db, private Auth $auth, private array $config) {}
    private function query(string $sql, array $values = []): PDOStatement {
        $q = $this->db->prepare($sql); $q->execute($values); return $q;
    }
    private function transaction(callable $fn): array {
        $this->db->beginTransaction();
        try { $result = $fn(); $this->db->commit(); return $result; }
        catch (Throwable $e) { if ($this->db->inTransaction()) $this->db->rollBack(); throw $e; }
    }
    private function staff(): array { return $this->auth->requireUser(); }
    private static function id(mixed $id): string {
        if (!is_string($id) || !preg_match('/\A[1-9][0-9]{0,17}\z/', $id)) throw new ApiError(422, 'Invalid product or image ID.');
        return $id;
    }
    private static function text(array $input, string $key, int $max, bool $required = false): string {
        $s = trim(Auth::text($input, $key, $max));
        if ($required && $s === '') throw new ApiError(422, "$key is required.");
        return $s;
    }
    private static function decimal(array $input, string $key, int $scale, string $max, bool $positive = false): string {
        $v = $input[$key] ?? '';
        if (!is_string($v) || !preg_match('/\A(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,' . $scale . '})?\z/', $v) || bccomp($v, $max, $scale) > 0 || ($positive && bccomp($v, '0', $scale) <= 0)) throw new ApiError(422, "Invalid $key (maximum $max, $scale decimal places).");
        return bcadd($v, '0', $scale);
    }
    // Decimal arithmetic only. Round non-negative financial totals half up to cents.
    private static function cents(string $v): string { return bcadd($v, '0.005', 2); }
    public static function costing(array $input): array {
        $currency = self::text($input, 'purchase_currency', 3, true);
        if (!in_array($currency, ['CAD','USD','EUR','CNY','JPY'], true)) throw new ApiError(422, 'Unsupported purchase currency.');
        $c = ['purchase_currency' => $currency];
        foreach (['purchase_price_per_kg'=>[4,'1000000',false], 'purchased_kg'=>[3,'1000000',true], 'yield_percent'=>[4,'100',true], 'cad_per_purchase_currency'=>[8,'10000',true], 'freight_cad'=>[2,'100000000',false], 'handling_cad'=>[2,'100000000',false], 'duties_cad'=>[2,'100000000',false], 'other_cad'=>[2,'100000000',false], 'target_price_cad'=>[2,'1000000',false]] as $key=>$rule) $c[$key] = self::decimal($input, $key, ...$rule);
        if ($currency === 'CAD' && bccomp($c['cad_per_purchase_currency'], '1', 8) !== 0) throw new ApiError(422, 'CAD exchange rate must be 1.');
        $purchase = bcmul(bcmul($c['purchase_price_per_kg'], $c['purchased_kg'], 7), $c['cad_per_purchase_currency'], 15);
        $total = self::cents($purchase);
        foreach (['freight_cad','handling_cad','duties_cad','other_cad'] as $k) $total = bcadd($total, $c[$k], 2);
        $saleable = bcdiv(bcmul($c['purchased_kg'], $c['yield_percent'], 7), '100', 9);
        $cost = self::cents(bcdiv($total, $saleable, 12));
        $revenue = self::cents(bcmul($saleable, $c['target_price_cad'], 12));
        foreach ([$total, $cost, $revenue] as $amount) {
            if (bccomp($amount, '999999999999.99', 2) > 0) throw new ApiError(422, 'Calculated costs or revenue exceed the reporting limit. Check weights and exchange rates.');
        }
        $profit = bcsub($revenue, $total, 2);
        return $c + ['landed_cost_cad'=>$total, 'cost_per_saleable_kg_cad'=>$cost, 'saleable_kg'=>$saleable, 'profit_cad'=>$profit, 'margin_percent'=>bccomp($revenue,'0',2)>0 ? bcdiv(bcmul($profit,'100',4),$revenue,2) : null];
    }
    private function audit(string $id, string $actor, string $action): void {
        $this->query('INSERT INTO starline_product_audit (product_id, actor_id, action) VALUES (?,?,?)', [$id,$actor,$action]);
    }
    private function exists(string $id, bool $lock = false): array {
        $p = $this->query('SELECT * FROM starline_products WHERE id = ?' . ($lock ? ' FOR UPDATE' : ''), [$id])->fetch();
        if (!$p) throw new ApiError(404, 'Product not found.');
        return $p;
    }
    private function images(string $id): array {
        $rows = $this->query('SELECT id, alt_text, sort_order, is_primary, stored_filename FROM starline_product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order, id', [$id])->fetchAll();
        return array_map(function($r) {
            $r['url'] = '/api/index.php?action=product-image&file=' . rawurlencode($r['stored_filename']);
            unset($r['stored_filename']); return $r;
        }, $rows);
    }
    public function catalog(): array {
        // Deliberate allowlist; no joins to confidential cost/auth/audit tables.
        $rows = $this->query("SELECT id, name, description, category, unit, public_price_cad FROM starline_products WHERE status = 'published' ORDER BY sort_order, id LIMIT 500")->fetchAll();
        foreach ($rows as &$p) $p['images'] = $this->images((string)$p['id']);
        return ['products'=>$rows];
    }
    public function list(): array {
        $this->staff();
        return ['products'=>$this->query('SELECT id, sku, name, category, status, public_price_cad, updated_at FROM starline_products ORDER BY sort_order, id DESC LIMIT 500')->fetchAll()];
    }
    public function get(string $id): array {
        $this->staff(); $id=self::id($id); $p=$this->exists($id);
        $p['images']=$this->images($id);
        $c=$this->query('SELECT * FROM starline_product_costs WHERE product_id=?',[$id])->fetch();
        $p['costs']=$c ? self::costing($c) : null;
        return ['product'=>$p];
    }
    public function save(array $input): array {
        $user=$this->staff();
        $id=isset($input['id']) ? self::id($input['id']) : null;
        $p=[];
        foreach (['sku'=>80,'name'=>180,'description'=>10000,'category'=>100,'unit'=>32] as $k=>$max) $p[$k]=self::text($input,$k,$max,in_array($k,['sku','name','unit'],true));
        $p['public_price_cad']=($input['public_price_cad']??'') === '' ? null : self::decimal($input,'public_price_cad',2,'1000000');
        $p['status']=self::text($input,'status',20,true);
        if (!in_array($p['status'],['draft','published','archived'],true)) throw new ApiError(422,'Invalid product status.');
        $sort=$input['sort_order']??'0';
        if (!is_string($sort) || !preg_match('/\A-?[0-9]{1,6}\z/',$sort)) throw new ApiError(422,'Invalid sort order.');
        $p['sort_order']=$sort;
        try {
            return $this->transaction(function() use($id,$p,$user) {
                if ($id) { $this->exists($id,true); $sets=implode(',',array_map(fn($k)=>"$k = ?",array_keys($p))); $this->query("UPDATE starline_products SET $sets, updated_by=? WHERE id=?",[...array_values($p),$user['id'],$id]); }
                else { $keys=implode(',',array_keys($p)); $marks=implode(',',array_fill(0,count($p),'?')); $this->query("INSERT INTO starline_products ($keys,created_by,updated_by) VALUES ($marks,?,?)",[...array_values($p),$user['id'],$user['id']]); $id=$this->db->lastInsertId(); }
                $this->audit($id,$user['id'],'product.saved'); return ['id'=>$id];
            });
        } catch (PDOException $e) { if (($e->errorInfo[1]??0)===1062) throw new ApiError(409,'This SKU is already in use.'); throw $e; }
    }
    public function saveCosts(array $input): array {
        $user=$this->staff(); $id=self::id($input['id']??null); $c=self::costing($input);
        $stored=array_intersect_key($c,array_flip(['purchase_currency','purchase_price_per_kg','purchased_kg','yield_percent','cad_per_purchase_currency','freight_cad','handling_cad','duties_cad','other_cad','target_price_cad']));
        return $this->transaction(function() use($id,$stored,$c,$user) {
            $this->exists($id,true); $keys=implode(',',array_keys($stored)); $marks=implode(',',array_fill(0,count($stored),'?'));
            $updates=implode(',',array_map(fn($k)=>"$k=VALUES($k)",array_keys($stored)));
            $this->query("INSERT INTO starline_product_costs (product_id,$keys,updated_by) VALUES (?,$marks,?) ON DUPLICATE KEY UPDATE $updates, updated_by=VALUES(updated_by)",[$id,...array_values($stored),$user['id']]);
            $this->audit($id,$user['id'],'costs.saved'); return ['costs'=>$c];
        });
    }
    public function delete(array $input): array {
        $user=$this->staff(); $id=self::id($input['id']??null);
        return $this->transaction(function() use($id,$user) {
            $p=$this->exists($id,true);
            if ($p['status']!=='archived') throw new ApiError(409,'Archive the product before deleting it.');
            $this->audit($id,$user['id'],'product.deleted');
            // Keep unreachable image files for backup recovery; cleanup is a separate maintenance task.
            $this->query('DELETE FROM starline_products WHERE id=?',[$id]); return ['ok'=>true];
        });
    }
    private function mediaDir(): string {
        $dir=$this->config['private_dir'].'/var/product-images';
        if (!is_dir($dir) && !mkdir($dir,0700,true)) throw new RuntimeException('Image storage unavailable');
        return $dir;
    }
    public function upload(array $input): array {
        $user=$this->staff(); $id=self::id($input['id']??null);
        $alt=self::text($input,'alt_text',255,true);
        $file=$_FILES['image']??null;
        if (!$file || $file['error']!==UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) throw new ApiError(422,'Choose a JPEG, PNG, or WebP image (maximum 5 MB).');
        if ($file['size']>5*1024*1024) throw new ApiError(413,'Image exceeds 5 MB.');
        $mime=(new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
        if (!in_array($mime,['image/jpeg','image/png','image/webp'],true)) throw new ApiError(422,'Unsupported image type.');
        $size=@getimagesize($file['tmp_name']);
        if (!$size || $size[0]<1 || $size[1]<1 || $size[0]>5000 || $size[1]>5000 || $size[0]*$size[1]>16000000) throw new ApiError(422,'Image dimensions exceed limits (5000 per side, 16 megapixels).');
        $image=@imagecreatefromstring(file_get_contents($file['tmp_name']));
        if (!$image) throw new ApiError(422,'Image cannot be decoded.');
        $filename=bin2hex(random_bytes(24)).'.jpg'; $path=$this->mediaDir().'/'.$filename;
        try {
            // Flatten and re-encode decoded pixels, removing all metadata and embedded payloads.
            $clean=imagecreatetruecolor($size[0],$size[1]);
            imagefill($clean,0,0,imagecolorallocate($clean,255,255,255));
            imagecopy($clean,$image,0,0,0,0,$size[0],$size[1]);
            if (!imagejpeg($clean,$path,85)) throw new RuntimeException('Image encoding failed');
            imagedestroy($clean);
            return $this->transaction(function() use($id,$filename,$alt,$user) {
                $this->exists($id,true);
                $count=(int)$this->query('SELECT COUNT(*) FROM starline_product_images WHERE product_id=?',[$id])->fetchColumn();
                if ($count>=12) throw new ApiError(422,'Maximum 12 images per product.');
                $this->query('INSERT INTO starline_product_images (product_id,stored_filename,alt_text,sort_order,is_primary) VALUES (?,?,?,?,?)',[$id,$filename,$alt,$count,$count===0?1:0]);
                $this->audit($id,$user['id'],'image.uploaded'); return ['ok'=>true];
            });
        } catch(Throwable $e) { if(is_file($path)) unlink($path); throw $e; }
        finally { imagedestroy($image); }
    }
    public function imageEdit(array $input, bool $delete = false): array {
        $user=$this->staff(); $id=self::id($input['id']??null); $imageId=self::id($input['image_id']??null);
        return $this->transaction(function() use($id,$imageId,$input,$delete,$user) {
            $this->exists($id,true);
            $img=$this->query('SELECT * FROM starline_product_images WHERE id=? AND product_id=?',[$imageId,$id])->fetch();
            if (!$img) throw new ApiError(404,'Image not found.');
            if ($delete) {
                $this->query('DELETE FROM starline_product_images WHERE id=?',[$imageId]);
                if ($img['is_primary']) $this->query('UPDATE starline_product_images SET is_primary=1 WHERE product_id=? ORDER BY sort_order,id LIMIT 1',[$id]);
            } else {
                $alt=self::text($input,'alt_text',255,true);
                $sort=$input['sort_order']??'0'; if (!is_string($sort)||!preg_match('/\A[0-9]{1,6}\z/',$sort)) throw new ApiError(422,'Invalid image order.');
                if (($input['is_primary']??false)===true) $this->query('UPDATE starline_product_images SET is_primary=0 WHERE product_id=?',[$id]);
                $this->query('UPDATE starline_product_images SET alt_text=?,sort_order=?,is_primary=? WHERE id=?',[$alt,$sort,($input['is_primary']??false)===true?1:(int)$img['is_primary'],$imageId]);
            }
            $this->audit($id,$user['id'],$delete?'image.deleted':'image.updated'); return ['ok'=>true];
        });
    }
    public function serveImage(string $file): never {
        if (!preg_match('/\A[a-f0-9]{48}\.jpg\z/',$file)) throw new ApiError(404,'Image not found.');
        $row=$this->query('SELECT p.status FROM starline_product_images i JOIN starline_products p ON p.id=i.product_id WHERE i.stored_filename=?',[$file])->fetch();
        if (!$row) throw new ApiError(404,'Image not found.');
        if ($row['status']!=='published') $this->staff();
        $path=$this->mediaDir().'/'.$file;
        if (!is_file($path)) throw new ApiError(404,'Image not found.');
        header('Content-Type: image/jpeg'); header('Cache-Control: no-store');
        header('Content-Length: '.filesize($path)); readfile($path); exit;
    }
}
