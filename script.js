let currentTab = 'acc', myChart = null;

// 1. 页签切换逻辑 [cite: 43, 58]
function switchTab(type) {
    currentTab = type;
    document.getElementById('tab-acc').className = type === 'acc' ? 'active' : '';
    document.getElementById('tab-end').className = type === 'end' ? 'active' : '';
    document.getElementById('saveItem').style.display = type === 'acc' ? 'flex' : 'none';
    document.getElementById('expenseLabel').innerText = type === 'acc' ? '退休后年开销 (元)' : '当前年度总开销 (元)';
    document.getElementById('baseLabel').innerText = type === 'acc' ? '基础路径达成时间' : '基础路径支撑时长';
    document.getElementById('actualLabel').innerText = type === 'acc' ? '实际路径达成时间' : '实际路径支撑时长';
}

function resetAll() {
    if(confirm("确定要清空重置所有数据吗？")) location.reload();
}

// 2. 动态添加行逻辑 [cite: 33, 68]
function addRow(type) {
    const div = document.createElement('div');
    div.className = 'dynamic-row';
    if (type === 'stage') {
        div.innerHTML = `<input type="number" class="st-start" placeholder="从第几年"> <input type="number" class="st-end" placeholder="到第几年"> <input type="number" class="st-exp" placeholder="年额外金额">`;
        document.getElementById('stage-list').appendChild(div);
    } else if (type === 'onetime') {
        div.innerHTML = `<input type="number" class="ot-amt" placeholder="金额(+/-)"> <input type="number" class="ot-year" placeholder="第几年发生">`;
        document.getElementById('onetime-list').appendChild(div);
    } else if (type === 'asset') {
        div.className = 'asset-row';
        div.innerHTML = `<input type="text" class="asset-name" placeholder="资产名"> <input type="number" class="asset-amount" placeholder="金额"> <input type="number" class="asset-rate" placeholder="收益%">`;
        document.getElementById('asset-list').appendChild(div);
    }
}

// 3. 资产配置计算同步 [cite: 73]
function calculatePortfolio() {
    const amounts = document.getElementsByClassName('asset-amount');
    const rates = document.getElementsByClassName('asset-rate');
    let totalVal = 0, weightedSum = 0;
    for (let i = 0; i < amounts.length; i++) {
        let a = parseFloat(amounts[i].value) || 0;
        let r = parseFloat(rates[i].value) || 0;
        totalVal += a;
        weightedSum += a * (r / 100);
    }
    if (totalVal > 0) {
        const res = (weightedSum / totalVal) * 100;
        document.getElementById('nominalReturn').value = res.toFixed(2);
        updateRealRateHint();
        alert("已根据资产配置更新名义收益率！");
    }
}

// 4. 核心测算逻辑 [cite: 38, 56, 99]
function runCoreCalculation() {
    const nomVal = document.getElementById('nominalReturn').value;
    if (!nomVal) { alert("请在投资设定中填写「名义收益率」"); return; }

    const current = parseFloat(document.getElementById('currentSavings').value) || 0;
    const annualSave = parseFloat(document.getElementById('annualSavings').value) || 0;
    const baseExp = parseFloat(document.getElementById('annualExpense').value) || 0;
    const inf = parseFloat(document.getElementById('inflationRate').value) || 0;
    const swr = parseFloat(document.getElementById('swrRange').value) / 100;
    
    const targetCapital = baseExp / swr;
    document.getElementById('targetAmount').innerText = `¥${Math.round(targetCapital).toLocaleString()}`;

    // 抗通胀实际收益率公式
    const realAnnual = (1 + parseFloat(nomVal)/100) / (1 + inf/100) - 1;
    const realMonth = Math.pow(1 + realAnnual, 1/12) - 1;

    // 获取非线性动态数据 [cite: 34, 35, 52, 53]
    const sS = Array.from(document.getElementsByClassName('st-start')).map(i => parseInt(i.value) || 0);
    const sE = Array.from(document.getElementsByClassName('st-end')).map(i => parseInt(i.value) || 0);
    const sX = Array.from(document.getElementsByClassName('st-exp')).map(i => parseFloat(i.value) || 0);
    const otA = Array.from(document.getElementsByClassName('ot-amt')).map(i => parseFloat(i.value) || 0);
    const otY = Array.from(document.getElementsByClassName('ot-year')).map(i => parseInt(i.value) || 0);

    const baseRes = simulate(current, annualSave, baseExp, realMonth, targetCapital, false, [], [], [], [], []);
    const actRes = simulate(current, annualSave, baseExp, realMonth, targetCapital, true, sS, sE, sX, otA, otY);

    renderUI(baseRes, actRes, current, targetCapital);
}

// 5. 模拟模拟核心逻辑 
function simulate(start, aSave, baseE, rate, target, isNon, sS, sE, sX, otA, otY) {
    let bal = start, history = [Math.round(bal)], m = 0;
    if (currentTab === 'acc' && bal >= target) return { m: 0, history: [Math.round(bal)] };

    while (m < 1200) {
        m++;
        let curNonExp = 0, curOt = 0;
        if (isNon) {
            for (let i=0; i<sS.length; i++) if (m >= sS[i]*12 && m <= sE[i]*12) curNonExp += sX[i] / 12;
            for (let i=0; i<otY.length; i++) if (m === otY[i]*12) curOt += otA[i];
        }

        if (currentTab === 'acc') {
            // 积累模型 [cite: 34, 35]
            bal = bal * (1 + rate) + (aSave / 12) - curNonExp + curOt;
            history.push(Math.round(bal));
            if (bal >= target) break;
        } else {
            // 耐力模型 [cite: 52, 53]
            bal = (bal - (baseE / 12) - curNonExp + curOt) * (1 + rate);
            history.push(Math.round(bal));
            if (bal <= 0) break;
        }
    }
    return { m, history };
}

// 6. UI 渲染与图表绘制 
function renderUI(base, act, start, target) {
    document.getElementById('result-box').style.display = 'block';
    const fmt = m => m === 0 ? "已达成" : `${Math.floor(m/12)}年${m%12}个月`;
    document.getElementById('baseTimeResult').innerText = fmt(base.m);
    document.getElementById('actualTimeResult').innerText = fmt(act.m);
    
    const ctx = document.getElementById('fireChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: Math.max(base.history.length, act.history.length)}, (_,i) => i%12===0 ? Math.floor(i/12)+'年' : ''),
            datasets: [
                { label: '基础路径', data: base.history, borderColor: '#d1d1d6', pointRadius: 0, borderWidth: 2, fill: false },
                { label: '实际路径', data: act.history, borderColor: '#007aff', backgroundColor: 'rgba(0,122,255,0.05)', fill: true, pointRadius: 0, borderWidth: 3 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: { grid: { display: false } }, y: { display: false } }
        }
    });
}

function updateRealRateHint() {
    const nom = parseFloat(document.getElementById('nominalReturn').value);
    const inf = parseFloat(document.getElementById('inflationRate').value) || 0;
    const label = document.getElementById('realRateLabel');
    if (isNaN(nom)) { label.innerText = ""; return; }
    const real = ((1 + nom/100) / (1 + inf/100) - 1) * 100;
    label.innerText = `(实际增值: ${real.toFixed(2)}%)`;
}
document.getElementById('nominalReturn').addEventListener('input', updateRealRateHint);
