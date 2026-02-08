// 切换功能显示
function showCalc(type) {
    document.getElementById('accumulation-calc').style.display = type === 'accumulation' ? 'block' : 'none';
    document.getElementById('endurance-calc').style.display = type === 'endurance' ? 'block' : 'none';
    document.getElementById('tab-acc').className = type === 'accumulation' ? 'active' : '';
    document.getElementById('tab-end').className = type === 'endurance' ? 'active' : '';
}

// 核心功能 1：积累阶段计算 [cite: 51-52]
function calculateAccumulation() {
    const current = parseFloat(document.getElementById('acc-current').value) || 0;
    const monthly = parseFloat(document.getElementById('acc-monthly').value) || 0;
    const expense = parseFloat(document.getElementById('acc-expense').value) || 0;
    const nominalRate = parseFloat(document.getElementById('acc-rate').value) / 100 || 0;

    const inflation = 0.03;      // 默认通胀 3% [cite: 73]
    const withdrawalRate = 0.04; // 默认提取率 4% [cite: 74]
    
    const target = expense / withdrawalRate; // 目标储蓄 = 目标年开销 / 提取率 [cite: 45]
    const realRate = (1 + nominalRate) / (1 + inflation) - 1; // 实际收益率公式 [cite: 49]

    let years = 0;
    let balance = current;
    const annualSavings = monthly * 12;

    // 使用循环计算达到目标所需的最小年数 [cite: 52]
    while (balance < target && years < 100) {
        balance = balance * (1 + realRate) + annualSavings;
        years++;
    }

    document.getElementById('acc-result').style.display = 'block';
    document.getElementById('acc-target-out').innerText = Math.round(target).toLocaleString();
    document.getElementById('acc-years-out').innerText = years >= 100 ? "100+" : years;
}

// 核心功能 2：耐力计算器 [cite: 53-56]
function calculateEndurance() {
    const current = parseFloat(document.getElementById('end-current').value) || 0;
    const expense = parseFloat(document.getElementById('end-expense').value) || 0;
    const nominalRate = parseFloat(document.getElementById('end-rate').value) / 100 || 0;
    
    const inflation = 0.03;
    const realRate = (1 + nominalRate) / (1 + inflation) - 1;

    let years = 0;
    let balance = current;

    // 只要余额大于年度开销，生活就能继续 [cite: 55-56]
    while (balance >= expense && years < 100) {
        balance = (balance - expense) * (1 + realRate);
        years++;
    }

    document.getElementById('end-result').style.display = 'block';
    document.getElementById('end-years-out').innerText = years >= 100 ? "100+" : years;
}