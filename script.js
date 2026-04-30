let myChart = null;

function addRow(type) {
    const containerId = type === 'stage' ? 'stage-list' : 'onetime-list';
    const div = document.createElement('div');
    div.className = 'dynamic-row';
    const delBtn = `<button onclick="this.parentElement.remove();" class="btn-delete">×</button>`;
    if (type === 'stage') {
        div.innerHTML = `<label>第N年起</label><input type="number" class="st-s"><label>持续年数</label><input type="number" class="st-d"><label>年额外支出</label><input type="number" class="st-v">${delBtn}`;
    } else {
        div.innerHTML = `<label>金额 (+进/-出)</label><input type="number" class="ot-amt"><label>发生年份</label><input type="number" class="ot-year">${delBtn}`;
    }
    document.getElementById(containerId).appendChild(div);
}

function runCoreCalculation() {
    // 逻辑：如果输入为空，自动套用占位符默认值
    const startBal = parseFloat(document.getElementById('currentSavings').value) || 3000000;
    const baseExp = parseFloat(document.getElementById('annualExpense').value) || 50000;
    const roi = parseFloat(document.getElementById('nominalReturn').value) / 100 || 0;
    const inf = parseFloat(document.getElementById('inflationRate').value) / 100 || 0;

    const stageInputs = Array.from(document.querySelectorAll('#stage-list .dynamic-row')).map(row => ({
        s: parseInt(row.querySelector('.st-s').value) || 0,
        d: parseInt(row.querySelector('.st-d').value) || 0,
        v: parseFloat(row.querySelector('.st-v').value) || 0
    }));
    const otInputs = Array.from(document.querySelectorAll('#onetime-list .dynamic-row')).map(row => ({
        y: parseInt(row.querySelector('.ot-year').value) || 0,
        v: parseFloat(row.querySelector('.ot-amt').value) || 0
    }));

    let currentBal = startBal, history = [Math.round(startBal)], year = 0;
    while (currentBal > 0 && year < 100) {
        year++;
        let gain = currentBal * roi; 
        let inflationExp = baseExp * Math.pow(1 + inf, year); 
        let extraExp = 0;
        stageInputs.forEach(st => { if (year >= st.s && year < st.s + st.d) extraExp += st.v; });
        otInputs.forEach(ot => { if (year === ot.y) currentBal += ot.v; });
        currentBal = currentBal + gain - inflationExp - extraExp;
        history.push(Math.round(Math.max(0, currentBal)));
    }
    // 计算结果展示
    const resVal = currentBal > 0 && year >= 100 ? "100+" : (year - 1 + (Math.max(0, history[history.length-2]) / (history[history.length-2] - currentBal + 0.1))).toFixed(1);
    document.getElementById('supportYears').innerText = resVal;
    renderChart(history);
}

function renderChart(data) {
    const ctx = document.getElementById('fireChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map((_, i) => i % 10 === 0 ? i + '年' : ''),
            datasets: [{ data: data, borderColor: '#007aff', borderWidth: 2, pointRadius: 0, fill: true, backgroundColor: 'rgba(0,122,255,0.05)', tension: 0.4 }]
        },
        options: { 
            responsive: true, maintainAspectRatio: false, 
            plugins: { legend: { display: false } }, 
            scales: { x: { grid: { display: false }, ticks: { color: '#8e8e93', font: { size: 10 } } }, y: { display: false } } 
        }
    });
}
function resetAll() { if(confirm("确定要重置所有数据吗？")) location.reload(); }
