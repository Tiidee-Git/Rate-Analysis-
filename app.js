const form = document.getElementById('analysisForm');
const csvUpload = document.getElementById('csvUpload');
const generateBtn = document.getElementById('generateReport');
const loadSampleBtn = document.getElementById('loadSample');
const showFormatSampleBtn = document.getElementById('showFormatSample');
const suggestValuesBtn = document.getElementById('suggestValues');
const resultsBody = document.querySelector('#resultsTable tbody');
const summaryCards = document.getElementById('summaryCards');
const reportPreview = document.getElementById('reportPreview');
const assistantOutput = document.getElementById('assistantOutput');

const knowledgeBase = [
  {
    id: 'concrete',
    keywords: ['cement concrete', 'concrete 1:2:4', 'cc 1:2:4'],
    itemName: 'Cement concrete 1:2:4 (20 mm aggregate)',
    unit: 'm3',
    boqRate: 18000,
    marketRate: 17200,
    lmcCoefficient: 1.04,
    bsrCoefficient: 1.08,
    remarks: 'Suggested from current local concrete mix market rates.',
    components: ['Cement', 'Sand', '20 mm aggregate', 'Water', 'Labour and mixing']
  },
  {
    id: 'masonry',
    keywords: ['masonry', 'brick masonry', 'stone masonry'],
    itemName: 'Masonry work in cement mortar 1:4',
    unit: 'm3',
    boqRate: 16500,
    marketRate: 15850,
    lmcCoefficient: 1.03,
    bsrCoefficient: 1.06,
    remarks: 'Suggested from current brickwork and mortar market pricing.',
    components: ['Bricks', 'Cement mortar', 'Labour', 'Scaffolding']
  },
  {
    id: 'plaster',
    keywords: ['plaster', 'internal plaster', 'external plaster'],
    itemName: 'Plastering in cement mortar 1:4',
    unit: 'm2',
    boqRate: 980,
    marketRate: 940,
    lmcCoefficient: 1.02,
    bsrCoefficient: 1.05,
    remarks: 'Suggested from current plastering supply and labour cost.',
    components: ['Cement', 'Sand', 'Labour', 'Waterproofing additives']
  },
  {
    id: 'steel',
    keywords: ['reinforcement', 'steel', 'rebar'],
    itemName: 'Reinforcement steel bar',
    unit: 'kg',
    boqRate: 95,
    marketRate: 88,
    lmcCoefficient: 1.01,
    bsrCoefficient: 1.04,
    remarks: 'Suggested from latest steel bar market quotations.',
    components: ['Steel bars', 'Binding wire', 'Cutting and bending']
  }
];

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

function normalizeText(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
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

function getSuggestion(description) {
  const normalizedDescription = normalizeText(description || '');

  if (!normalizedDescription) {
    return {
      ...sampleData,
      matched: false,
      confidence: 0,
      reason: 'Please enter an item description to get an AI-style suggestion.'
    };
  }

  let bestMatch = null;
  let highestScore = 0;

  knowledgeBase.forEach((entry) => {
    const score = entry.keywords.reduce((total, keyword) => {
      return total + (normalizeText(keyword).includes(normalizedDescription) || normalizedDescription.includes(normalizeText(keyword)) ? 2 : 0);
    }, 0);

    if (score > highestScore) {
      highestScore = score;
      bestMatch = entry;
    }
  });

  if (bestMatch && highestScore > 0) {
    return {
      ...bestMatch,
      matched: true,
      confidence: Math.min(0.98, 0.7 + highestScore * 0.08),
      reason: `Matched to a known BOQ item pattern using keywords such as ${bestMatch.keywords.join(', ')}.`
    };
  }

  return {
    itemName: description,
    unit: 'm3',
    quantity: 1,
    boqRate: 12000,
    marketRate: 11000,
    lmcCoefficient: 1.03,
    bsrCoefficient: 1.06,
    remarks: 'No exact match found. Estimated from standard tender assumptions.',
    matched: false,
    confidence: 0.45,
    reason: 'A generic estimate was prepared from standard tender assumptions.',
    components: ['Material', 'Labour', 'Transport']
  };
}

function renderAssistantOutput(suggestion) {
  const componentsHtml = (suggestion.components || []).map((component) => `<li>${component}</li>`).join('');
  assistantOutput.innerHTML = `
    <div class="assistant-card">
      <div class="assistant-title">AI-style suggestion</div>
      <p><strong>${suggestion.itemName || 'Item'}</strong></p>
      <p>${suggestion.reason || ''}</p>
      <ul>
        <li>Suggested unit: ${suggestion.unit || 'n/a'}</li>
        <li>Latest market rate: ${formatNumber(suggestion.marketRate || 0)}</li>
        <li>LMC 2026 coefficient: ${suggestion.lmcCoefficient || 0}</li>
        <li>BSR 2026 coefficient: ${suggestion.bsrCoefficient || 0}</li>
      </ul>
      <div class="assistant-subtitle">Suggested components</div>
      <ul>${componentsHtml}</ul>
    </div>
  `;
}

function applySuggestion() {
  const suggestion = getSuggestion(document.getElementById('itemName').value);
  populateForm({
    ...suggestion,
    quantity: suggestion.quantity || 1
  });
  renderAssistantOutput(suggestion);
  generateReport();
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

  const previewHtml = rows.map((row, index) => {
    const componentsText = (row.components || []).join(' | ');
    return `
      <div class="report-sheet">
        <h4>BSR Rate Analysis Sheet</h4>
        <div class="header-line"></div>
        <div class="section">
          <div class="section-title">Description of Work</div>
          <div class="row"><span class="label">Item No.</span><span class="value">${index + 1}</span></div>
          <div class="row"><span class="label">Description</span><span class="value">${row.itemName}</span></div>
          <div class="row"><span class="label">Unit</span><span class="value">${row.unit}</span></div>
          <div class="row"><span class="label">Quantity</span><span class="value">${formatNumber(row.quantity)}</span></div>
        </div>
        <div class="section">
          <div class="section-title">Rate Analysis</div>
          <div class="row"><span class="label">BOQ Rate</span><span class="value">${formatNumber(row.boqRate)}</span></div>
          <div class="row"><span class="label">Latest Market Rate</span><span class="value">${formatNumber(row.marketRate)}</span></div>
          <div class="row"><span class="label">LMC 2026 Coefficient</span><span class="value">${row.lmcCoefficient}</span></div>
          <div class="row"><span class="label">BSR 2026 Coefficient</span><span class="value">${row.bsrCoefficient}</span></div>
        </div>
        <div class="section">
          <div class="row"><span class="label">LMC 2026 Rate</span><span class="value">${formatNumber(row.lmcRate)}</span></div>
          <div class="row"><span class="label">BSR 2026 Rate</span><span class="value">${formatNumber(row.bsrRate)}</span></div>
          <div class="row"><span class="label">Recommended Rate</span><span class="value">${formatNumber(row.recommendedRate)}</span></div>
          <div class="row"><span class="label">Amount</span><span class="value">${formatNumber(row.amount)}</span></div>
        </div>
        <div class="section">
          <div class="section-title">Remarks</div>
          <div class="row"><span class="label">Suggested Components</span><span class="value">${componentsText || 'N/A'}</span></div>
          <div class="row"><span class="label">Remarks</span><span class="value">${row.remarks || 'N/A'}</span></div>
        </div>
      </div>
    `;
  }).join('');

  reportPreview.innerHTML = `
    <div class="report-sheet">
      <h4>Bhutan Tender Rate Analysis</h4>
      <div class="header-line"></div>
      <div class="section">
        <div class="section-title">Summary</div>
        <div class="row"><span class="label">Items Analysed</span><span class="value">${rows.length}</span></div>
        <div class="row"><span class="label">Average Recommended Rate</span><span class="value">${formatNumber(averageRecommended)}</span></div>
        <div class="row"><span class="label">Total Amount</span><span class="value">${formatNumber(totalAmount)}</span></div>
      </div>
    </div>
    ${previewHtml}
  `;
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
suggestValuesBtn.addEventListener('click', applySuggestion);
showFormatSampleBtn.addEventListener('click', () => {
  populateForm(sampleData);
  renderAssistantOutput(sampleData);
  generateReport();
  document.getElementById('formatSample').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});
loadSampleBtn.addEventListener('click', () => {
  populateForm(sampleData);
  renderAssistantOutput(sampleData);
  generateReport();
});
csvUpload.addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (file) {
    parseCsv(file);
  }
});

populateForm(sampleData);
renderAssistantOutput(sampleData);
generateReport();
