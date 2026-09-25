import {renderPayrollControl as renderBasePayrollControl} from './payroll-control-ui.js';
import {getSalaryForecasts,getPayslips} from './storage.js';
import {buildPayrollControlHistory} from './payroll-control.js';
import {buildPayrollNetBreakdown} from './payroll-net-breakdown.js';
import {appendPayrollNetBreakdown} from './payroll-net-ui.js';

export function renderPayrollControl(){
  renderBasePayrollControl();

  const forecasts=getSalaryForecasts();
  const payslips=getPayslips();
  const controls=buildPayrollControlHistory({forecasts,payslips});
  const cards=[...document.querySelectorAll('#payrollControlList .payroll-control-card')];

  controls.forEach((item,index)=>{
    const card=cards[index];
    if(!card)return;
    const forecast=forecasts.find(entry=>entry.payoutMonth===item.payoutMonth);
    const netBreakdown=buildPayrollNetBreakdown({
      forecast,
      actual:{payout:item.actualPayout,hasPriorAdjustment:item.hasPriorAdjustment},
      variableRows:item.variableRows,
      retro:item.retro,
      estimatedNetImpact:item.estimatedNetImpact
    });
    appendPayrollNetBreakdown(card,{...item,netBreakdown});
  });
}
