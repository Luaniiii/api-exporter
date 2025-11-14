const API_BASE = '/api';

// Note: DOMContentLoaded listener moved to bottom of file after handleAggregateSubmit function

async function loadEndpoints() {
    const listContainer = document.getElementById('endpointsList');
    listContainer.innerHTML = '<div class="loading">Loading endpoints...</div>';

    try {
        const response = await fetch(`${API_BASE}/endpoints`);
        const data = await response.json();

        if (data.ok && data.endpoints.length > 0) {
            listContainer.innerHTML = '';
            data.endpoints.forEach(endpoint => {
                listContainer.appendChild(createEndpointCard(endpoint));
            });
        } else {
            listContainer.innerHTML = '<div class="empty-state">No endpoints yet. Create one to get started!</div>';
        }
    } catch (error) {
        listContainer.innerHTML = `<div class="empty-state">Error loading endpoints: ${error.message}</div>`;
        console.error('Error loading endpoints:', error);
    }
}

function createEndpointCard(endpoint) {
    const card = document.createElement('div');
    card.className = 'endpoint-item';
    
    const scheduleDesc = getScheduleDescription(endpoint.schedule);
    
    card.innerHTML = `
        <div class="endpoint-header">
            <div class="endpoint-name">${escapeHtml(endpoint.name)}</div>
            <div class="endpoint-actions">
                <button class="btn btn-success btn-small" onclick="runEndpoint('${endpoint.id}')">
                    ▶️ Run Now
                </button>
                <button class="btn btn-secondary btn-small" onclick="viewFiles('${endpoint.id}')">
                    📁 Files
                </button>
                <button class="btn btn-secondary btn-small" onclick="downloadAllFiles('${endpoint.id}')" title="Download all files as ZIP">
                    📦 Download All
                </button>
                <button class="btn btn-secondary btn-small" onclick="viewTrends('${endpoint.id}')">
                    📈 Trends
                </button>
                <button class="btn btn-secondary btn-small" onclick="viewLogs('${endpoint.id}')">
                    📝 Logs
                </button>
                <button class="btn btn-secondary btn-small" onclick="editEndpoint('${endpoint.id}')">
                    ✏️ Edit
                </button>
                <button class="btn btn-danger btn-small" onclick="deleteEndpoint('${endpoint.id}')">
                    🗑️ Delete
                </button>
            </div>
        </div>
        <div class="endpoint-details">
            <div class="detail-item">
                <span class="detail-label">URL</span>
                <span class="detail-value">${escapeHtml(endpoint.url)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Method</span>
                <span class="detail-value">${endpoint.method || 'GET'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Schedule</span>
                <span class="detail-value">${scheduleDesc}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Format</span>
                <span class="detail-value">${endpoint.saveFormat || 'json'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Created</span>
                <span class="detail-value">${formatDate(endpoint.createdAt)}</span>
            </div>
        </div>
    `;
    
    return card;
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const maxAge = document.getElementById('maxFileAgeDays').value.trim();
    
    const formData = {
        name: document.getElementById('name').value,
        url: document.getElementById('url').value,
        method: document.getElementById('method').value,
        schedule: document.getElementById('schedule').value || '*/5 * * * *',
        saveFormat: document.getElementById('saveFormat').value,
        savePath: document.getElementById('savePath').value || './data',
        notifyOnChange: document.getElementById('notifyOnChange').checked,
        maxFileAgeDays: maxAge ? parseInt(maxAge, 10) : null
    };

    const headersText = document.getElementById('headers').value.trim();
    if (headersText) {
        try {
            formData.headers = JSON.parse(headersText);
        } catch (error) {
            alert('Invalid JSON in headers field. Please check your syntax.');
            return;
        }
    }

    try {
        const response = await fetch(`${API_BASE}/endpoints`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.ok) {
            alert('✅ Endpoint created successfully!');
            document.getElementById('endpointForm').reset();
            document.getElementById('schedule').value = '*/5 * * * *';
            document.getElementById('savePath').value = './data';
            loadEndpoints();
        } else {
            alert(`❌ Error: ${data.error || 'Failed to create endpoint'}`);
        }
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
        console.error('Error creating endpoint:', error);
    }
}

async function editEndpoint(id) {
    try {
        const response = await fetch(`${API_BASE}/endpoints/${id}`);
        const data = await response.json();

        if (data.ok && data.endpoint) {
            const ep = data.endpoint;
            
            document.getElementById('editId').value = ep.id;
            document.getElementById('editName').value = ep.name || '';
            document.getElementById('editUrl').value = ep.url || '';
            document.getElementById('editMethod').value = ep.method || 'GET';
            document.getElementById('editSchedule').value = ep.schedule || '*/5 * * * *';
            document.getElementById('editSaveFormat').value = ep.saveFormat || 'json';
            document.getElementById('editSavePath').value = ep.savePath || './data';
            document.getElementById('editMaxFileAgeDays').value = ep.maxFileAgeDays || '';
            document.getElementById('editHeaders').value = JSON.stringify(ep.headers || {}, null, 2);
            document.getElementById('editNotifyOnChange').checked = ep.notifyOnChange === 1 || ep.notifyOnChange === true;
            
            document.getElementById('editModal').style.display = 'block';
        } else {
            alert(`❌ Error: ${data.error || 'Failed to load endpoint'}`);
        }
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
        console.error('Error loading endpoint for edit:', error);
    }
}

async function handleEditSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('editId').value;
    const schedule = document.getElementById('editSchedule').value.trim();
    const savePath = document.getElementById('editSavePath').value.trim();
    const maxAge = document.getElementById('editMaxFileAgeDays').value.trim();
    
    const formData = {
        name: document.getElementById('editName').value.trim(),
        url: document.getElementById('editUrl').value.trim(),
        method: document.getElementById('editMethod').value,
        schedule: schedule || '*/5 * * * *',
        saveFormat: document.getElementById('editSaveFormat').value,
        savePath: savePath || './data',
        notifyOnChange: document.getElementById('editNotifyOnChange').checked,
        maxFileAgeDays: maxAge ? parseInt(maxAge, 10) : null
    };

    const headersText = document.getElementById('editHeaders').value.trim();
    if (headersText) {
        try {
            formData.headers = JSON.parse(headersText);
        } catch (error) {
            alert('Invalid JSON in headers field. Please check your syntax.');
            return;
        }
    } else {
        formData.headers = {};
    }

    try {
        const response = await fetch(`${API_BASE}/endpoints/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { error: errorText };
            }
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.ok) {
            alert('✅ Endpoint updated successfully!');
            closeEditModal();
            setTimeout(() => loadEndpoints(), 100);
        } else {
            alert(`❌ Error: ${data.error || 'Failed to update endpoint'}`);
        }
    } catch (error) {
        console.error('Error updating endpoint:', error);
        alert(`❌ Error: ${error.message}`);
    }
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    document.getElementById('editEndpointForm').reset();
}

async function deleteEndpoint(id) {
    if (!confirm('Are you sure you want to delete this endpoint?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/endpoints/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.ok) {
            alert('✅ Endpoint deleted successfully!');
            loadEndpoints();
        } else {
            alert(`❌ Error: ${data.error || 'Failed to delete endpoint'}`);
        }
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
        console.error('Error deleting endpoint:', error);
    }
}

async function runEndpoint(id) {
    try {
        const response = await fetch(`${API_BASE}/endpoints/${id}/run`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.ok) {
            alert('✅ Endpoint executed successfully!');
            loadEndpoints();
        } else {
            alert(`❌ Error: ${data.error || 'Failed to run endpoint'}`);
        }
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
        console.error('Error running endpoint:', error);
    }
}

async function viewFiles(endpointId) {
    const modal = document.getElementById('filesModal');
    const filesContent = document.getElementById('filesContent');
    
    modal.dataset.endpointId = endpointId;
    filesContent.innerHTML = '<div class="loading">Loading files...</div>';
    modal.style.display = 'block';

    try {
        const response = await fetch(`${API_BASE}/endpoints/${endpointId}/files`);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server returned non-JSON response');
        }
        
        const data = await response.json();

        if (data.ok && data.files && data.files.length > 0) {
            filesContent.innerHTML = '';
            
            // Add download buttons at the top
            const downloadButtons = document.createElement('div');
            downloadButtons.className = 'download-buttons-container';
            downloadButtons.style.cssText = 'margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; display: flex; gap: 10px; flex-wrap: wrap;';
            downloadButtons.innerHTML = `
                <button class="btn btn-primary btn-small" onclick="downloadAllFiles('${endpointId}')">
                    📦 Download All Files (ZIP)
                </button>
                <button class="btn btn-primary btn-small" onclick="openAggregateModal('${endpointId}')">
                    📊 Download Aggregated Data
                </button>
            `;
            filesContent.appendChild(downloadButtons);
            
            data.files.forEach(file => {
                filesContent.appendChild(createFileItem(file));
            });
        } else {
            filesContent.innerHTML = '<div class="empty-state">No files found for this endpoint.</div>';
        }
    } catch (error) {
        filesContent.innerHTML = `<div class="empty-state">Error loading files: ${error.message}</div>`;
        console.error('Error loading files:', error);
    }
}

function createFileItem(file) {
    const item = document.createElement('div');
    item.className = 'file-item';
    
    const fileIcon = file.name.endsWith('.csv') ? '📊' : '📄';
    const fileSize = formatFileSize(file.size);
    
    item.innerHTML = `
        <div class="file-header">
            <div class="file-info">
                <span class="file-icon">${fileIcon}</span>
                <div class="file-details">
                    <div class="file-name">${escapeHtml(file.name)}</div>
                    <div class="file-meta">
                        <span>Size: ${fileSize}</span>
                        <span>•</span>
                        <span>Created: ${formatDate(file.runTime)}</span>
                        ${file.diffDetected ? '<span class="change-indicator">⚠️ Changed</span>' : ''}
                    </div>
                </div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary btn-small" data-file-path="${escapeHtml(file.path)}" data-file-name="${escapeHtml(file.name)}" onclick="viewFileContent(this.dataset.filePath, this.dataset.fileName)">
                    👁️ View
                </button>
                <button class="btn btn-secondary btn-small" data-file-path="${escapeHtml(file.path)}" data-file-name="${escapeHtml(file.name)}" onclick="compareFile(this.dataset.filePath, this.dataset.fileName)">
                    🔍 Compare
                </button>
                <button class="btn btn-primary btn-small" data-file-path="${escapeHtml(file.path)}" data-file-name="${escapeHtml(file.name)}" onclick="downloadFile(this.dataset.filePath, this.dataset.fileName)">
                    ⬇️ Download
                </button>
            </div>
        </div>
    `;
    
    return item;
}

function downloadFile(filePath, fileName) {
    try {
        const decodedPath = decodeURIComponent(filePath);
        const url = `${API_BASE}/files/download?path=${encodeURIComponent(decodedPath)}`;
        
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
                }
                return response.blob();
            })
            .then(blob => {
                const downloadUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(downloadUrl);
            })
            .catch(error => {
                alert(`❌ Error downloading file: ${error.message}`);
                console.error('Download error:', error);
            });
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
        console.error('Download error:', error);
    }
}

function closeFilesModal() {
    document.getElementById('filesModal').style.display = 'none';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function viewLogs(endpointId) {
    const modal = document.getElementById('logsModal');
    const logsContent = document.getElementById('logsContent');
    
    logsContent.innerHTML = '<div class="loading">Loading logs...</div>';
    modal.style.display = 'block';

    try {
        const response = await fetch(`${API_BASE}/endpoints/${endpointId}/logs`);
        const data = await response.json();

        if (data.ok && data.logs.length > 0) {
            logsContent.innerHTML = '';
            data.logs.forEach(log => {
                logsContent.appendChild(createLogItem(log));
            });
        } else {
            logsContent.innerHTML = '<div class="empty-state">No logs found for this endpoint.</div>';
        }
    } catch (error) {
        logsContent.innerHTML = `<div class="empty-state">Error loading logs: ${error.message}</div>`;
        console.error('Error loading logs:', error);
    }
}

function createLogItem(log) {
    const item = document.createElement('div');
    item.className = `log-item ${log.status}`;
    
    const statusBadge = log.status === 'success' 
        ? '<span class="badge badge-success">Success</span>'
        : '<span class="badge badge-error">Error</span>';
    
    item.innerHTML = `
        <div class="log-header">
            <div>
                <span class="log-status">${statusBadge}</span>
            </div>
            <div class="log-time">${formatDate(log.runTime)}</div>
        </div>
        <div class="log-details">
            ${log.filePath ? `<div><strong>File:</strong> ${escapeHtml(log.filePath)}</div>` : ''}
            ${log.diffDetected ? '<div><strong>⚠️ Changes detected</strong></div>' : ''}
            ${log.errorMessage ? `<div><strong>Error:</strong> ${escapeHtml(log.errorMessage)}</div>` : ''}
        </div>
    `;
    
    return item;
}

async function viewFileContent(filePath, fileName) {
    const modal = document.getElementById('dataViewerModal');
    const content = document.getElementById('dataViewerContent');
    
    content.innerHTML = '<div class="loading">Loading file content...</div>';
    modal.style.display = 'block';

    try {
        let decodedPath = filePath;
        try {
            decodedPath = decodeURIComponent(filePath);
        } catch (e) {
            decodedPath = filePath;
        }
        const response = await fetch(`${API_BASE}/files/content?path=${encodeURIComponent(decodedPath)}`);
        const data = await response.json();

        if (data.ok) {
            let displayContent = '';
            
            if (data.isJSON) {
                displayContent = `<pre class="json-viewer">${escapeHtml(JSON.stringify(data.content, null, 2))}</pre>`;
            } else if (data.isCSV) {
                displayContent = `<pre class="csv-viewer">${escapeHtml(data.rawContent)}</pre>`;
            } else {
                displayContent = `<pre class="text-viewer">${escapeHtml(data.rawContent)}</pre>`;
            }
            
            content.innerHTML = `
                <div style="margin-bottom: 15px;">
                    <strong>File:</strong> ${escapeHtml(fileName)}<br>
                    <strong>Type:</strong> ${data.isJSON ? 'JSON' : data.isCSV ? 'CSV' : 'Text'}
                </div>
                <div style="max-height: 70vh; overflow: auto; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    ${displayContent}
                </div>
            `;
        } else {
            content.innerHTML = `<div class="empty-state">Error: ${data.error || 'Failed to load file'}</div>`;
        }
    } catch (error) {
        content.innerHTML = `<div class="empty-state">Error loading file: ${error.message}</div>`;
        console.error('Error loading file content:', error);
    }
}

function closeDataViewerModal() {
    document.getElementById('dataViewerModal').style.display = 'none';
}

async function compareFile(filePath, fileName) {
    const modal = document.getElementById('diffViewerModal');
    const content = document.getElementById('diffViewerContent');
    
    content.innerHTML = '<div class="loading">Loading files for comparison...</div>';
    modal.style.display = 'block';

    try {
        const filesModal = document.getElementById('filesModal');
        const endpointId = filesModal.dataset.endpointId;
        
        if (!endpointId) {
            const currentResponse = await fetch(`${API_BASE}/files/content?path=${encodeURIComponent(filePath)}`);
            const currentData = await currentResponse.json();
            
            if (currentData.ok) {
                content.innerHTML = `
                    <div style="margin-bottom: 20px;">
                        <p><strong>Current File:</strong> ${escapeHtml(fileName)}</p>
                        <p style="color: #64748b;">Unable to find previous file. Showing current file only.</p>
                    </div>
                    <div style="max-height: 60vh; overflow: auto; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <pre class="text-viewer" style="white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(currentData.rawContent)}</pre>
                    </div>
                `;
            }
            return;
        }
        
        const filesResponse = await fetch(`${API_BASE}/endpoints/${endpointId}/files`);
        const filesData = await filesResponse.json();
        
        if (!filesData.ok || !filesData.files || filesData.files.length < 2) {
            content.innerHTML = `
                <div class="empty-state">
                    <p>No previous file found to compare with.</p>
                    <p style="color: #64748b; font-size: 0.9rem;">At least 2 files are needed for comparison.</p>
                </div>
            `;
            return;
        }
        
        const decodedCurrentPath = decodeURIComponent(filePath);
        const currentIndex = filesData.files.findIndex(f => {
            return f.path === decodedCurrentPath || f.path === filePath;
        });
        
        if (currentIndex === -1 || currentIndex === filesData.files.length - 1) {
            content.innerHTML = `
                <div class="empty-state">
                    <p>No previous file found to compare with.</p>
                    <p style="color: #64748b; font-size: 0.9rem;">This is the oldest file or file not found in list.</p>
                </div>
            `;
            return;
        }
        
        const previousFile = filesData.files[currentIndex + 1];
        await compareTwoFiles(previousFile.path, filePath, previousFile.name, fileName);
        
    } catch (error) {
        content.innerHTML = `<div class="empty-state">Error: ${error.message}</div>`;
        console.error('Error comparing files:', error);
    }
}

async function compareTwoFiles(filePath1, filePath2, fileName1, fileName2) {
    const modal = document.getElementById('diffViewerModal');
    const content = document.getElementById('diffViewerContent');
    
    content.innerHTML = '<div class="loading">Comparing files...</div>';
    modal.style.display = 'block';

    try {
        let decodedPath1 = filePath1;
        let decodedPath2 = filePath2;
        try {
            decodedPath1 = decodeURIComponent(filePath1);
            decodedPath2 = decodeURIComponent(filePath2);
        } catch (e) {}
        const response = await fetch(`${API_BASE}/files/compare?path1=${encodeURIComponent(decodedPath1)}&path2=${encodeURIComponent(decodedPath2)}`);
        const data = await response.json();

        if (data.ok) {
            let diffHtml = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">';
            diffHtml += `<div><strong>File 1:</strong> ${escapeHtml(fileName1)}</div>`;
            diffHtml += `<div><strong>File 2:</strong> ${escapeHtml(fileName2)}</div>`;
            diffHtml += '</div>';
            
            diffHtml += '<div style="max-height: 70vh; overflow: auto; background: #f8f9fa; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 0.9rem;">';
            
            data.diff.forEach(item => {
                let className = '';
                let prefix = '';
                if (item.type === 'added') {
                    className = 'diff-added';
                    prefix = '+ ';
                } else if (item.type === 'removed') {
                    className = 'diff-removed';
                    prefix = '- ';
                } else {
                    className = 'diff-unchanged';
                    prefix = '  ';
                }
                diffHtml += `<div class="${className}" style="padding: 2px 0; line-height: 1.5;">`;
                diffHtml += `<span style="color: #64748b; margin-right: 10px;">${item.line}</span>`;
                diffHtml += `<span>${prefix}${escapeHtml(item.content)}</span>`;
                diffHtml += '</div>';
            });
            
            diffHtml += '</div>';
            content.innerHTML = diffHtml;
        } else {
            content.innerHTML = `<div class="empty-state">Error: ${data.error || 'Failed to compare files'}</div>`;
        }
    } catch (error) {
        content.innerHTML = `<div class="empty-state">Error: ${error.message}</div>`;
        console.error('Error comparing files:', error);
    }
}

function closeDiffViewerModal() {
    document.getElementById('diffViewerModal').style.display = 'none';
}

function closeLogsModal() {
    document.getElementById('logsModal').style.display = 'none';
}

let trendChart = null;

async function viewTrends(endpointId) {
    const modal = document.getElementById('trendViewerModal');
    const content = document.getElementById('trendViewerContent');
    const infoDiv = document.getElementById('trendInfo');
    const chartContainer = document.getElementById('trendChartContainer');
    
    if (chartContainer) {
        chartContainer.style.display = 'none';
    }
    
    const existingMessages = content.querySelectorAll('.loading, .empty-state');
    existingMessages.forEach(msg => msg.remove());
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.textContent = 'Loading trend data...';
    content.insertBefore(loadingDiv, content.firstChild);
    
    infoDiv.innerHTML = '';
    modal.style.display = 'block';
    
    if (trendChart) {
        trendChart.destroy();
        trendChart = null;
    }

    try {
        const response = await fetch(`${API_BASE}/endpoints/${endpointId}/trends`);
        const data = await response.json();

        if (!data.ok || !data.files || data.files.length === 0) {
            const loadingDiv = content.querySelector('.loading');
            if (loadingDiv) loadingDiv.remove();
            if (chartContainer) chartContainer.style.display = 'none';
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'empty-state';
            errorDiv.textContent = 'No data available for trends. Run the endpoint a few times to collect data.';
            content.appendChild(errorDiv);
            return;
        }

        const trendData = extractTrendData(data.files);
        
        if (trendData.values.length === 0) {
            const loadingDiv = content.querySelector('.loading');
            if (loadingDiv) loadingDiv.remove();
            if (chartContainer) chartContainer.style.display = 'none';
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'empty-state';
            errorDiv.innerHTML = `
                <p><strong>📊 Trends visualization is only available for numeric data.</strong></p>
                <p style="margin-top: 10px; color: #64748b;">
                    This endpoint returns text/string data, which cannot be visualized as a trend graph.
                    <br><br>
                    <strong>To use trends:</strong> Your API should return numeric values like:
                    <ul style="text-align: left; display: inline-block; margin-top: 10px;">
                        <li>Prices (e.g., Bitcoin price: <code>{"price": 45000}</code>)</li>
                        <li>Counts (e.g., User count: <code>{"count": 1234}</code>)</li>
                        <li>Metrics (e.g., Temperature: <code>{"temp": 72.5}</code>)</li>
                    </ul>
                </p>
            `;
            content.appendChild(errorDiv);
            return;
        }

        const loadingDiv = content.querySelector('.loading');
        if (loadingDiv) loadingDiv.remove();
        
        let container = document.getElementById('trendChartContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'trendChartContainer';
            container.style.cssText = 'position: relative; height: 400px; margin-top: 20px;';
            content.appendChild(container);
        }
        container.style.display = 'block';

        let canvas = document.getElementById('trendChart');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'trendChart';
            container.appendChild(canvas);
        }

        const ctx = canvas.getContext('2d');
        trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trendData.labels,
                datasets: [{
                    label: trendData.label,
                    data: trendData.values,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `Trend: ${data.endpoint.name}`
                    },
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });

        const stats = calculateStats(trendData.values);
        infoDiv.innerHTML = `
            <h3 style="margin-top: 0;">Statistics</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                <div>
                    <strong>Current:</strong> ${formatNumber(trendData.values[trendData.values.length - 1])}
                </div>
                <div>
                    <strong>Min:</strong> ${formatNumber(stats.min)}
                </div>
                <div>
                    <strong>Max:</strong> ${formatNumber(stats.max)}
                </div>
                <div>
                    <strong>Average:</strong> ${formatNumber(stats.avg)}
                </div>
                <div>
                    <strong>Change:</strong> <span style="color: ${stats.change >= 0 ? '#10b981' : '#ef4444'}">${stats.change >= 0 ? '+' : ''}${formatNumber(stats.change)} (${stats.changePercent >= 0 ? '+' : ''}${stats.changePercent.toFixed(2)}%)</span>
                </div>
                <div>
                    <strong>Data Points:</strong> ${trendData.values.length}
                </div>
            </div>
        `;

    } catch (error) {
        const loadingDiv = content.querySelector('.loading');
        if (loadingDiv) loadingDiv.remove();
        if (chartContainer) chartContainer.style.display = 'none';
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'empty-state';
        errorDiv.textContent = `Error loading trends: ${error.message}`;
        content.appendChild(errorDiv);
        console.error('Error loading trends:', error);
    }
}

function extractTrendData(files) {
    const labels = [];
    const values = [];
    let label = 'Value';
    
    for (const file of files) {
        let value = null;
        
        if (file.content) {
            if (file.content.csv) {
                const csv = file.content.csv;
                if (csv.rows && csv.rows.length > 0) {
                    for (let i = 0; i < csv.headers.length; i++) {
                        let isNumericColumn = true;
                        let firstNumericValue = null;
                        
                        const rowsToCheck = Math.min(3, csv.rows.length);
                        for (let rowIdx = 0; rowIdx < rowsToCheck; rowIdx++) {
                            const cellValue = csv.rows[rowIdx][i];
                            if (cellValue === undefined || cellValue === null || cellValue === '') {
                                continue;
                            }
                            
                            if (typeof cellValue === 'string' && /[a-zA-Z]/.test(cellValue.trim())) {
                                isNumericColumn = false;
                                break;
                            }
                            
                            const numValue = parseFloat(cellValue);
                            if (isNaN(numValue)) {
                                isNumericColumn = false;
                                break;
                            }
                            
                            if (firstNumericValue === null) {
                                firstNumericValue = numValue;
                            }
                        }
                        
                        if (isNumericColumn && firstNumericValue !== null) {
                            value = firstNumericValue;
                            if (label === 'Value') label = csv.headers[i];
                            break;
                        }
                    }
                }
            } else {
                value = findNumericValue(file.content, label);
                if (value !== null && label === 'Value') {
                    label = findNumericKey(file.content);
                }
            }
        }
        
        if (value !== null) {
            const date = new Date(file.runTime);
            labels.push(date.toLocaleString());
            values.push(value);
        }
    }
    
    return { labels, values, label };
}

function findNumericValue(obj, currentLabel = 'Value') {
    if (typeof obj === 'number') {
        return obj;
    }
    
    if (typeof obj === 'string') {
        const trimmed = obj.trim();
        if (trimmed.length === 0 || /[a-zA-Z]/.test(trimmed)) {
            return null;
        }
        const num = parseFloat(trimmed);
        if (!isNaN(num) && isFinite(num)) {
            return num;
        }
        return null;
    }
    
    if (Array.isArray(obj)) {
        if (obj.length > 0 && typeof obj[0] === 'string' && obj[0].trim().length > 0) {
            if (obj.every(item => typeof item === 'number')) {
                return obj[0];
            }
            return null;
        }
        if (obj.length > 0) {
            return findNumericValue(obj[0]);
        }
        return null;
    }
    
    if (typeof obj === 'object' && obj !== null) {
        const priorityKeys = ['price', 'value', 'usd', 'amount', 'rate', 'cost', 'total', 'count', 'number', 'quantity', 'score', 'percentage'];
        
        for (const key of priorityKeys) {
            if (obj[key] !== undefined) {
                if (typeof obj[key] === 'number') {
                    return obj[key];
                }
                if (typeof obj[key] === 'string') {
                    const trimmed = obj[key].trim();
                    if (trimmed.length > 0 && !/[a-zA-Z]/.test(trimmed)) {
                        const num = parseFloat(trimmed);
                        if (!isNaN(num) && isFinite(num)) {
                            return num;
                        }
                    }
                }
                if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                    const nestedValue = findNumericValue(obj[key]);
                    if (nestedValue !== null) {
                        return nestedValue;
                    }
                }
            }
        }
        
        const textFieldIndicators = ['text', 'message', 'description', 'name', 'title', 'content', 'data', 'info', 'details'];
        for (const key in obj) {
            if (textFieldIndicators.some(indicator => key.toLowerCase().includes(indicator))) {
                continue;
            }
            
            if (typeof obj[key] === 'number') {
                return obj[key];
            }
            
            if (typeof obj[key] === 'string') {
                const trimmed = obj[key].trim();
                if (trimmed.length > 0 && !/[a-zA-Z]/.test(trimmed)) {
                    const num = parseFloat(trimmed);
                    if (!isNaN(num) && isFinite(num)) {
                        return num;
                    }
                }
            }
            
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                if (Array.isArray(obj[key])) {
                    if (obj[key].length > 0 && typeof obj[key][0] === 'string' && !obj[key].every(item => typeof item === 'number')) {
                        continue;
                    }
                }
                const nestedValue = findNumericValue(obj[key]);
                if (nestedValue !== null) {
                    return nestedValue;
                }
            }
        }
    }
    
    return null;
}

function findNumericKey(obj) {
    if (typeof obj === 'object' && obj !== null) {
        const priorityKeys = ['price', 'value', 'usd', 'amount', 'rate', 'cost', 'total', 'count', 'number'];
        
        for (const key of priorityKeys) {
            if (obj[key] !== undefined) {
                if (typeof obj[key] === 'number') {
                    return key.charAt(0).toUpperCase() + key.slice(1);
                }
                if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                    const nestedKey = findNumericKey(obj[key]);
                    if (nestedKey !== 'Value') {
                        return nestedKey;
                    }
                }
            }
        }
        
        for (const key in obj) {
            if (typeof obj[key] === 'number') {
                return key.charAt(0).toUpperCase() + key.slice(1);
            }
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                const nestedKey = findNumericKey(obj[key]);
                if (nestedKey !== 'Value') {
                    return nestedKey;
                }
            }
        }
    }
    
    return 'Value';
}

function calculateStats(values) {
    if (values.length === 0) return { min: 0, max: 0, avg: 0, change: 0, changePercent: 0 };
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const change = values.length > 1 ? values[values.length - 1] - values[0] : 0;
    const changePercent = values.length > 1 && values[0] !== 0 ? (change / values[0]) * 100 : 0;
    
    return { min, max, avg, change, changePercent };
}

function formatNumber(num) {
    if (num === null || num === undefined) return 'N/A';
    return typeof num === 'number' ? num.toLocaleString('en-US', { maximumFractionDigits: 2 }) : num;
}

// Close trend viewer modal
function closeTrendViewerModal() {
    if (trendChart) {
        trendChart.destroy();
        trendChart = null;
    }
    document.getElementById('trendViewerModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const logsModal = document.getElementById('logsModal');
    const filesModal = document.getElementById('filesModal');
    const editModal = document.getElementById('editModal');
    const dataViewerModal = document.getElementById('dataViewerModal');
    const diffViewerModal = document.getElementById('diffViewerModal');
    const trendViewerModal = document.getElementById('trendViewerModal');
    const aggregateModal = document.getElementById('aggregateModal');
    if (event.target === logsModal) {
        logsModal.style.display = 'none';
    }
    if (event.target === filesModal) {
        filesModal.style.display = 'none';
    }
    if (event.target === editModal) {
        editModal.style.display = 'none';
    }
    if (event.target === dataViewerModal) {
        dataViewerModal.style.display = 'none';
    }
    if (event.target === diffViewerModal) {
        diffViewerModal.style.display = 'none';
    }
    if (event.target === trendViewerModal) {
        closeTrendViewerModal();
    }
    if (event.target === aggregateModal) {
        closeAggregateModal();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
}

function getScheduleDescription(cron) {
    const descriptions = {
        '*/5 * * * *': 'Every 5 minutes',
        '*/15 * * * *': 'Every 15 minutes',
        '*/30 * * * *': 'Every 30 minutes',
        '0 * * * *': 'Every hour',
        '0 */6 * * *': 'Every 6 hours',
        '0 0 * * *': 'Daily at midnight',
        '0 9 * * *': 'Daily at 9 AM',
        '0 9 * * 1': 'Every Monday at 9 AM'
    };
    
    return descriptions[cron] || cron;
}

async function downloadAllFiles(endpointId) {
    try {
        const url = `${API_BASE}/endpoints/${endpointId}/download-all`;
        
        // Show loading indicator
        const loadingMsg = document.createElement('div');
        loadingMsg.className = 'loading';
        loadingMsg.textContent = 'Preparing ZIP file...';
        loadingMsg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 2000;';
        document.body.appendChild(loadingMsg);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { error: errorText };
            }
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        
        // Get filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'all-files.zip';
        if (contentDisposition) {
            // Try to extract from filename*=UTF-8''... first (RFC 5987)
            let filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+?)(?:;|$)/);
            if (filenameMatch) {
                try {
                    filename = decodeURIComponent(filenameMatch[1]);
                } catch (e) {
                    // Fall back to regular filename
                }
            }
            // If not found, try regular filename parameter
            if (filename === 'all-files.zip') {
                filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/);
                if (filenameMatch) {
                    filename = filenameMatch[1].trim();
                }
            }
        }
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        
        document.body.removeChild(loadingMsg);
    } catch (error) {
        alert(`❌ Error downloading files: ${error.message}`);
        console.error('Download all files error:', error);
        const loadingMsg = document.querySelector('.loading[style*="position: fixed"]');
        if (loadingMsg) {
            document.body.removeChild(loadingMsg);
        }
    }
}

function openAggregateModal(endpointId) {
    document.getElementById('aggregateEndpointId').value = endpointId;
    document.getElementById('aggregateFields').value = '';
    document.getElementById('aggregateFormat').value = 'json';
    document.getElementById('aggregateModal').style.display = 'block';
}

function closeAggregateModal() {
    document.getElementById('aggregateModal').style.display = 'none';
    document.getElementById('aggregateForm').reset();
}

document.addEventListener('DOMContentLoaded', () => {
    loadEndpoints();
    document.getElementById('endpointForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('editEndpointForm').addEventListener('submit', handleEditSubmit);
    document.getElementById('aggregateForm').addEventListener('submit', handleAggregateSubmit);
});

async function handleAggregateSubmit(e) {
    e.preventDefault();
    
    const endpointId = document.getElementById('aggregateEndpointId').value;
    const fields = document.getElementById('aggregateFields').value.trim();
    const format = document.getElementById('aggregateFormat').value;
    
    try {
        let url = `${API_BASE}/endpoints/${endpointId}/aggregate?format=${format}`;
        if (fields) {
            url += `&fields=${encodeURIComponent(fields)}`;
        }
        
        // Show loading indicator
        const loadingMsg = document.createElement('div');
        loadingMsg.className = 'loading';
        loadingMsg.textContent = 'Generating aggregated file...';
        loadingMsg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 2000;';
        document.body.appendChild(loadingMsg);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { error: errorText };
            }
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Get filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = null;
        if (contentDisposition) {
            // Try to extract from filename*=UTF-8''... first (RFC 5987)
            let filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+?)(?:;|$)/);
            if (filenameMatch) {
                try {
                    filename = decodeURIComponent(filenameMatch[1]);
                } catch (e) {
                    // Fall back to regular filename
                }
            }
            // If not found, try regular filename parameter
            if (!filename) {
                filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/);
                if (filenameMatch) {
                    filename = filenameMatch[1].trim();
                }
            }
        }
        // Use default if still not found
        if (!filename) {
            filename = `aggregated-${Date.now()}.${format}`;
        }
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        
        document.body.removeChild(loadingMsg);
        closeAggregateModal();
        alert('✅ Aggregated file downloaded successfully!');
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
        console.error('Aggregate download error:', error);
        const loadingMsg = document.querySelector('.loading[style*="position: fixed"]');
        if (loadingMsg) {
            document.body.removeChild(loadingMsg);
        }
    }
}

