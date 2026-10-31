import {withTrace} from './site/day2-trace.mjs';
import {compressionOriginFigure,csaOverviewFigure} from './site/compression-study.mjs';
import {csaMemoryFigure} from './site/csa-memory-study.mjs';
import * as day2 from './site/day2-study.mjs';
import {mixtureFigure,routerFigure} from './site/moe-study.mjs';
import {expertFigure} from './site/expert-study.mjs';
import {costsFigure} from './site/costs.mjs';
import {explanationFigure} from './site/explanations.mjs';
import {weekKinds,weekFigure,residualBridgeFigure} from './site/week-studies.mjs';
import {dayMapDays,dayMapFigure} from './site/day-maps.mjs';
import {residualAlternativesFigure,repeatedCarryFigure,hcOverviewFigure,hcInputFigure,hcOutputFigure,hcWiringFigure,constraintFigure,featureColumnFigure,transportReplayFigure,sinkhornFigure,coefficientFigure,blockFigure} from './site/residual-study.mjs';
const figures={...Object.fromEntries(['ced','hash','packing','timing'].map(kind=>[kind,explanationFigure(kind)])),...Object.fromEntries(weekKinds.map(kind=>['week-'+kind,weekFigure(kind)])),'residual-bridge':residualBridgeFigure(),'residual-alternatives':residualAlternativesFigure(),'residual-carry-gain':repeatedCarryFigure(),'hc-overview':hcOverviewFigure(),'hc-input':hcInputFigure(),'hc-output':hcOutputFigure(),'hc-wiring':hcWiringFigure(),'residual-feature-column':featureColumnFigure(),'residual-gain':constraintFigure(0),'residual-signed':constraintFigure(1),'residual-copy':constraintFigure(2),'residual-constraint':constraintFigure(),'residual-replay':transportReplayFigure(),'residual-sinkhorn':sinkhornFigure(),'residual-coefficient':coefficientFigure(),'residual-block':blockFigure(),'day2-row-division':day2.divisionFigure(1),'day2-column-division':day2.divisionFigure(2),'day2-sinkhorn':day2.sinkhornFigure(),'day2-preference':day2.preferenceFigure(),'day2-measurement':day2.measurementFigure(),'day2-predictor-scale':day2.predictorScaleFigure(),'day2-coefficient':day2.coefficientFigure(),'day2-input-scale':day2.inputScaleFigure(),'day2-block-trace':day2.blockFigure(),'day2-expert-calculation':day2.expertCalculation(),'day2-block-result':day2.blockResult(),costs:costsFigure(),expert:expertFigure(),mixture:mixtureFigure(),router:routerFigure()};
const traces={
 'residual-alternatives':['alternatives'], 'hc-overview':['hc-overview'], 'hc-wiring':['hc-wiring'],
 'residual-feature-column':['feature'], 'residual-gain':['transport',{index:0}], 'residual-signed':['transport',{index:1}], 'residual-copy':['transport',{index:2}], 'residual-constraint':['transport',{index:3}], 'residual-replay':['replay'],
 'day2-row-division':['division',{division:1}], 'day2-column-division':['division',{division:2}], 'day2-sinkhorn':['division',{division:2}],
 'day2-preference':['preference'], 'day2-measurement':['measurement'], 'day2-coefficient':['coefficient'], 'day2-block-trace':['block']
};
for(const [key,[kind,params]] of Object.entries(traces))figures[key]=withTrace(figures[key],kind,params);
figures['compression-origin']=compressionOriginFigure();
figures['csa-overview']=csaOverviewFigure();
for(const day of dayMapDays){
 const figure=withTrace(dayMapFigure(day),'day-overview-'+day).replace('Trace this calculation','Trace this module map').replace('Calculation<select','Part<select');
 figures['day-overview-'+day]=figure;
 if(day===3)figures['csa-overview']=figure;
}
figures['csa-memory']=withTrace(csaMemoryFigure(),'csa-memory').replace('Trace this calculation','Trace both memory paths').replace('Calculation<select','Arrival<select');
process.stdout.write(JSON.stringify(figures));
