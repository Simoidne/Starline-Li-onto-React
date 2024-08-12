import { motion,
        useScroll,
        useMotionValueEvent } from 'framer-motion';

const TestBox = () => {
    const { scrollYProgress } = useScroll();

    // TODO finish this animation 
    return (
        <motion.div
            className='testBox'
            style={{
                
            }}>
            <h1>Test Box</h1>
        </motion.div>
    );
};

export default TestBox