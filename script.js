let currentTab = 'acc', myChart = null;

function switchTab(type) {
    currentTab = type;
    document.getElementById('tab-acc').className = type === 'acc' ? 'active' : '';
    document.getElementById('tab-end').className = type === 'end' ? 'active' : '';
    document.getElementById('saveItem').style.display = type === 'acc' ? 'flex' : 'none';
    
    const mainResLabel = document.querySelector('.result-highlight .res-sub');
    if (type === 'acc') {
        document.getElementById('expenseLabel').innerText = '退休后年开销 (元)';
        document.getElementById('baseLabel').innerText = '理论路径达成时间';
        document.getElementById('actualLabel').innerText = '实测路径达成时间';
        mainResLabel.innerText = 'FIRE 目标总金额 (购买力计)';
    } else {
        document.getElementById('expenseLabel').innerText = '当前年度总开销 (元)';
        document.getElementById('baseLabel').innerText = '理论路径支撑时长';
        document.getElementById('actualLabel').innerText = '实测路径支撑时长';
        mainResLabel.innerText = '当前用于提取的总本金 (购买力计)';
    }
}

function resetAll() {
    if(confirm("确定要清空重置所有数据吗？")) location.reload();
}

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

function runCoreCalculation() {
    // 修改点：不再校验 nomVal 必填，默认取 0
    const rawNom = document.getElementById('nominalReturn').value;
    const nomVal = rawNom === "" ? 0 : parseFloat(rawNom);

    const current = parseFloat(document.getElementById('currentSavings').value) || 0;
    const annualSave = parseFloat(document.getElementById('annualSavings').value) || 0;
    const baseExp = parseFloat(document.getElementById('annualExpense').value) || 0;
    const inf = parseFloat(document.getElementById('inflationRate').value) || 0;
    const swr = parseFloat(document.getElementById('swrRange').value) / 100;
    
    if (currentTab === 'acc') {
        const targetCapital = baseExp / swr;
        document.getElementById('targetAmount').innerText = `¥${Math.round(targetCapital).toLocaleString()}`;
    } else {
        document.getElementById('targetAmount').innerText = `¥${Math.round(current).toLocaleString()}`;
    }

    // 抗通胀实际收益率计算
    const realAnnual = (1 + nomVal/100) / (1 + inf/100) - 1;
    const realMonth = Math.pow(1 + realAnnual, 1/12) - 1;

    const sS = Array.from(document.getElementsByClassName('st-start')).map(i => parseInt(i.value) || 0);
    const sE = Array.from(document.getElementsByClassName('st-end')).map(i => parseInt(i.value) || 0);
    const sX = Array.from(document.getElementsByClassName('st-exp')).map(i => parseFloat(i.value) || 0);
    const otA = Array.from(document.getElementsByClassName('ot-amt')).map(i => parseFloat(i.value) || 0);
    const otY = Array.from(document.getElementsByClassName('ot-year')).map(i => parseInt(i.value) || 0);

    const targetCapitalForSim = baseExp / swr;
    const baseRes = simulate(current, annualSave, baseExp, realMonth, targetCapitalForSim, false, [], [], [], [], []);
    const actRes = simulate(current, annualSave, baseExp, realMonth, targetCapitalForSim, true, sS, sE, sX, otA, otY);

    renderUI(baseRes, actRes);
}

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
            bal = bal * (1 + rate) + (aSave / 12) - curNonExp + curOt;
            history.push(Math.round(bal));
            if (bal >= target) break;
        } else {
            bal = (bal - (baseE / 12) - curNonExp + curOt) * (1 + rate);
            history.push(Math.round(bal));
            if (bal <= 0) { history[history.length-1] = 0; break; }
        }
    }
    return { m, history };
}

function renderUI(base, act) {
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
                { label: '理论路径', data: base.history, borderColor: '#d1d1d6', pointRadius: 0, borderWidth: 2, fill: false },
                { label: '实测路径', data: act.history, borderColor: '#007aff', backgroundColor: 'rgba(0,122,255,0.05)', fill: true, pointRadius: 0, borderWidth: 3 }
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
    const raw = document.getElementById('nominalReturn').value;
    const nom = raw === "" ? 0 : parseFloat(raw);
    const inf = parseFloat(document.getElementById('inflationRate').value) || 0;
    const label = document.getElementById('realRateLabel');
    // 如果没有输入，显示默认状态下的实际收益率（即 -通胀率）
    const real = ((1 + nom/100) / (1 + inf/100) - 1) * 100;
    label.innerText = `(实际增值: ${real.toFixed(2)}%)`;
}
document.getElementById('nominalReturn').addEventListener('input', updateRealRateHint);
