import { motion } from 'framer-motion';

const TestBox = () => (
    <motion.div
        className='testBox'
        animate={{
            scale: [1, 5, 2, 1, 1],
            rotate: [0, 0, 90, 270, 0],
            borderRadius: ["0%", "0%", "50%", "50%", "0%"]
        }}
        transition={{
            duration: 2,
            ease: "easeInOut",
            times: [0, 0.2, 0.5, 0.8, 1],
            repeat: 1,
        }}>
        <h1>Test Box</h1>
    </motion.div>
);

export default TestBox