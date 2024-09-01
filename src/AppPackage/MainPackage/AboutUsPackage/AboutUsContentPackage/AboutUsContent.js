import WhatWeDoContent from "./AboutUsContentComponents/WhatWeDoContent";
import WholesaleContent from "./AboutUsContentComponents/WholesaleContent";
import QualityAssurance from "./AboutUsContentComponents/QualityAssurance";
import RetailContent from "./AboutUsContentComponents/RetailContent";

const AboutUsContent = () => {
    return (
        <div className="aboutUsContent">
            <WhatWeDoContent />
            <RetailContent />
            <QualityAssurance />
            <WholesaleContent />
        </div>
    );
};

export default AboutUsContent