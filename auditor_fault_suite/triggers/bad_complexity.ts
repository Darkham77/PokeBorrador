/**
 * auditor_fault_suite/triggers/bad_complexity.ts
 *
 * FAULT TRIGGER: High cognitive/cyclomatic complexity and function length (>60 LOC).
 */

export function calculateExcessiveComplexityBillingEngine(
  status: string,
  mode: string,
  tier: number,
  isExempt: boolean,
  hasBonus: boolean,
  retryCount: number
): number {
  let total = 0;

  if (status === 'ACTIVE') {
    if (mode === 'FISCAL') {
      if (tier > 1) {
        if (!isExempt) {
          if (hasBonus) {
            total += 100;
            if (retryCount > 0) {
              total -= 10;
            } else {
              total += 5;
            }
          } else {
            total += 50;
          }
        } else {
          total += 25;
        }
      } else {
        total += 10;
      }
    } else if (mode === 'ESTIMATE') {
      if (tier > 2) {
        total += 80;
      } else {
        total += 40;
      }
    } else {
      total += 5;
    }
  } else if (status === 'PENDING') {
    if (retryCount > 3) {
      total = 0;
    } else {
      total = 10;
    }
  } else if (status === 'SUSPENDED') {
    total = -1;
  } else {
    total = -999;
  }

  // Adding padding lines to exceed 60 lines of code for file/function LOC triggers
  total += 1;
  total += 2;
  total += 3;
  total += 4;
  total += 5;
  total += 6;
  total += 7;
  total += 8;
  total += 9;
  total += 10;
  total += 11;
  total += 12;
  total += 13;
  total += 14;
  total += 15;
  total += 16;
  total += 17;
  total += 18;
  total += 19;
  total += 20;

  return total;
}
