const form = document.getElementById('analysisForm');
const csvUpload = document.getElementById('csvUpload');
const generateBtn = document.getElementById('generateReport');
const loadSampleBtn = document.getElementById('loadSample');
const resultsBody = document.querySelector('#resultsTable tbody');
const summaryCards = document.getElementById('summaryCards');
const reportPreview = document.getElementById('reportPreview');

const sampleData = {
  itemName: 'Cement concrete 1:2:4 (20 mm aggregate)',
  unit: 'm3',
  quantity: 12.5,
  boqRate: 18000,
  marketRate: 17200,
  lmcCoefficient: 1.04,
  bsrCoefficient: 1.08,
  remarks: 'Market quote checked with local supplier and current transport cost.'
};

function readFormValues() {
  const formData = new FormData(form);
  return {
    itemName: formData.get('itemName')?.toString().trim() || '',
    unit: formData.get('unit')?.toString().trim() || '',
    quantity: Number(formData.get('quantity')) || 0,
    boqRate: Number(formData.get('boqRate')) || 0,
    marketRate: Number(formData.get('marketRate')) || 0,
    lmcCoefficient: Number(formData.get('lmcCoefficient')) || 0,
    bsrCoefficient: Number(formData.get('bsrCoefficient')) || 0,
    remarks: formData.get('remarks')?.toString().trim() || ''
  };
}

function populateForm(data) {
  document.getElementById('itemName').value = data.itemName || '';
  document.getElementById('unit').value = data.unit || '';
  document.getElementById('quantity').value = data.quantity || '';
  document.getElementById('boqRate').value = data.boqRate || '';
  document.getElementById('marketRate').value = data.marketRate || '';
  document.getElementById('lmcCoefficient').value = data.lmcCoefficient || '';
  document.getElementById('bsrCoefficient').value = data.bsrCoefficient || '';
  document.getElementById('remarks').value = data.remarks || '';
}

function calculateRow(item) {
  const lmcRate = item.marketRate * item.lmcCoefficient;
  const bsrRate = item.marketRate * item.bsrCoefficient;
  const recommendedRate = (lmcRate + bsrRate) / 2;
  const amount = recommendedRate * item.quantity;

  return {
    ...item,
    lmcRate,
    bsrRate,
    recommendedRate,
    amount
  };
}

function formatNumber(value) {
  return Number(value).toLocaleString('en-BD', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });
}

function renderReport(rows) {
  resultsBody.innerHTML = '';
  summaryCards.innerHTML = '';

  const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0);
  const averageRecommended = rows.length
    ? rows.reduce((sum, row) => sum + row.recommendedRate, 0) / rows.length
    : 0;

  const summaryItems = [
    { label: 'Items analysed', value: rows.length },
    { label: 'Avg recommended rate', value: formatNumber(averageRecommended) },
    { label: 'Total amount', value: formatNumber(totalAmount) }
  ];

  summaryItems.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'summary-card';
    card.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong>`;
    summaryCards.appendChild(card);
  });

  rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.itemName}</td>
      <td>${row.unit}</td>
      <td>${formatNumber(row.quantity)}</td>
      <td>${formatNumber(row.boqRate)}</td>
      <td>${formatNumber(row.marketRate)}</td>
      <td>${formatNumber(row.lmcRate)}</td>
      <td>${formatNumber(row.bsrRate)}</td>
      <td>${formatNumber(row.recommendedRate)}</td>
      <td>${formatNumber(row.amount)}</td>
    `;
    resultsBody.appendChild(tr);
  });

  const preview = rows.map((row, index) => {
    return [
      `Item ${index + 1}`,
      `Description: ${row.itemName}`,
      `Unit: ${row.unit}`,
      `Quantity: ${formatNumber(row.quantity)}`,
      `BOQ Rate: ${formatNumber(row.boqRate)}`,
      `Latest Market Rate: ${formatNumber(row.marketRate)}`,
      `LMC 2026 Coefficient: ${row.lmcCoefficient}`,
      `BSR 2026 Coefficient: ${row.bsrCoefficient}`,
      `LMC 2026 Rate: ${formatNumber(row.lmcRate)}`,
      `BSR 2026 Rate: ${formatNumber(row.bsrRate)}`,
      `Recommended Rate: ${formatNumber(row.recommendedRate)}`,
      `Amount: ${formatNumber(row.amount)}`,
      `Remarks: ${row.remarks || 'N/A'}`,
      ''
    ].join('\n');
  }).join('\n');

  reportPreview.textContent = `BHUTAN TENDER RATE ANALYSIS\n===========================\n\n${preview}`;
}

function generateReport() {
  const row = calculateRow(readFormValues());
  renderReport([row]);
}

function parseCsv(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const text = reader.result;
    const rows = text
      .trim()
      .split(/\r?\n/)
      .map((line) => line.split(','));

    if (!rows.length) {
      alert('The CSV file is empty.');
      return;
    }

    const headers = rows[0].map((header) => header.trim().toLowerCase());
    const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell.trim()));

    const parsed = dataRows.map((row) => {
      const values = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']));
      const item = {
        itemName: values.item || values.description || values['item description'] || values.name || '',
        unit: values.unit || '',
        quantity: Number(values.quantity || values.qty || 0),
        boqRate: Number(values['boq rate'] || values.boq || values['boq_rate'] || 0),
        marketRate: Number(values['market rate'] || values['latest market rate'] || values['market_rate'] || 0),
        lmcCoefficient: Number(values['lmc coefficient'] || values.lmc || values['lmc_coeff'] || 0),
        bsrCoefficient: Number(values['bsr coefficient'] || values.bsr || values['bsr_coeff'] || 0),
        remarks: values.remarks || ''
      };
      return item;
    }).filter((item) => item.itemName);

    if (!parsed.length) {
      alert('No usable rows were found in the CSV.');
      return;
    }

    const rowsToRender = parsed.map(calculateRow);
    renderReport(rowsToRender);
  };
  reader.readAsText(file);
}

form.addEventListener('input', () => {
  const current = readFormValues();
  if (current.itemName || current.unit || current.quantity || current.boqRate || current.marketRate) {
    generateReport();
  }
});

generateBtn.addEventListener('click', generateReport);
loadSampleBtn.addEventListener('click', () => populateForm(sampleData));
csvUpload.addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (file) {
    parseCsv(file);
  }
});

populateForm(sampleData);
generateReport();
