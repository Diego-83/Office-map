/**
 * Web Exporter - создание интерактивного веб-интерфейса
 * ИСПРАВЛЕННАЯ ВЕРСИЯ: правильная очистка подсветки кабинетов и сброс маршрутов
 */

class WebExporter {
    constructor(dataManager) {
        this.dataManager = dataManager;
        console.log('WebExporter инициализирован');
    }

    /**
     * Экспорт веб-интерфейса
     */
    exportWebInterface(options = {}) {
        try {
            const htmlContent = this.generateWebHTML(options);
            const filename = options.filename || 'office_map.html';
            
            if (typeof Utils !== 'undefined' && Utils.downloadFile) {
                Utils.downloadFile(htmlContent, filename, 'text/html');
            } else {
                const blob = new Blob([htmlContent], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
            }
            
            return true;
        } catch (error) {
            console.error('Ошибка экспорта веб-интерфейса:', error);
            return false;
        }
    }

    /**
     * Генерация HTML для веб-интерфейса
     */
    generateWebHTML(options = {}) {
        const data = options.data || this.dataManager.getData();
        const title = options.title || 'Интерактивная карта офиса';
        const description = options.description || 'Поиск кабинетов и построение маршрутов';
        const theme = options.theme || 'light';
        
        const displayOptions = options.displayOptions || {
            showRooms: true,
            showRoomLabels: true,
            showPoints: true,
            showConnectionPoints: false,
            showConnectionLines: false,
            showEntrancePoints: false,
            showInterestPoints: true,
            showRouteArrows: false
        };

        const rooms = data.rooms || [];
        const points = data.points || [];
        const connections = data.connections || [];
        
        const graphData = this.createGraphData(points, connections);
        
        return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${this.escapeHtml(title)}</title>
    
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: ${theme === 'dark' ? '#1a1a1a' : '#f5f5f5'};
            color: ${theme === 'dark' ? '#fff' : '#333'};
            height: 100vh;
            overflow: hidden;
        }

        .container {
            display: flex;
            height: 100vh;
            width: 100vw;
            overflow: hidden;
        }

        .map-container {
            flex: 1;
            position: relative;
            height: 100vh;
            overflow: hidden;
        }

        #map {
            width: 100%;
            height: 100%;
            background: ${theme === 'dark' ? '#2d2d2d' : '#ddd'};
        }

        .control-panel {
            width: 400px;
            min-width: 350px;
            max-width: 450px;
            height: 100vh;
            background: ${theme === 'dark' ? '#2c2c2c' : '#fff'};
            border-left: 2px solid ${theme === 'dark' ? '#444' : '#ddd'};
            display: flex;
            flex-direction: column;
            overflow: hidden;
            position: relative;
            flex-shrink: 0;
        }

        .panel-content {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 15px;
            scrollbar-width: thin;
        }

        .panel-header {
            background: #2c3e50;
            color: white;
            padding: 15px 20px;
            text-align: center;
            border-bottom: 3px solid #3498db;
            flex-shrink: 0;
        }

        .panel-header h1 {
            font-size: 1.3em;
            margin-bottom: 5px;
        }

        .panel-header .subtitle {
            font-size: 0.85em;
            opacity: 0.9;
        }

        .status-bar {
            background: ${theme === 'dark' ? '#2c2c2c' : '#f8f9fa'};
            padding: 10px 15px;
            border-top: 1px solid ${theme === 'dark' ? '#444' : '#ddd'};
            font-size: 0.85em;
            color: ${theme === 'dark' ? '#aaa' : '#666'};
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        }

        .section {
            margin-bottom: 20px;
            padding: 15px;
            background: ${theme === 'dark' ? '#3a3a3a' : '#f8f9fa'};
            border-radius: 8px;
            border: 1px solid ${theme === 'dark' ? '#444' : '#eee'};
        }

        .section-title {
            font-size: 1.1em;
            font-weight: 600;
            margin-bottom: 12px;
            color: ${theme === 'dark' ? '#fff' : '#2c3e50'};
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .form-group {
            margin-bottom: 12px;
        }

        .form-group label {
            display: block;
            margin-bottom: 4px;
            font-weight: 500;
            font-size: 0.9em;
            color: ${theme === 'dark' ? '#ccc' : '#555'};
        }

        .form-control {
            width: 100%;
            padding: 10px;
            border: 1px solid ${theme === 'dark' ? '#555' : '#ddd'};
            border-radius: 6px;
            font-size: 13px;
            background: ${theme === 'dark' ? '#2c2c2c' : '#fff'};
            color: ${theme === 'dark' ? '#fff' : '#333'};
        }

        .btn {
            padding: 10px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: 13px;
        }

        .btn-primary {
            background: #3498db;
            color: white;
        }

        .btn-primary:hover {
            background: #2980b9;
        }

        .btn-success {
            background: #2ecc71;
            color: white;
        }

        .btn-success:hover {
            background: #27ae60;
        }

        .btn-danger {
            background: #e74c3c;
            color: white;
        }

        .btn-danger:hover {
            background: #c0392b;
        }

        .btn-block {
            width: 100%;
        }

        .list-container {
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid ${theme === 'dark' ? '#444' : '#eee'};
            border-radius: 6px;
            background: ${theme === 'dark' ? '#2c2c2c' : '#fff'};
        }

        .list-item {
            padding: 10px 12px;
            border-bottom: 1px solid ${theme === 'dark' ? '#444' : '#eee'};
            cursor: pointer;
            transition: background 0.2s;
            font-size: 13px;
        }

        .list-item:hover {
            background: ${theme === 'dark' ? '#3a3a3a' : '#f8f9fa'};
        }

        .list-item.active {
            background: ${theme === 'dark' ? '#34495e' : '#e3f2fd'};
            border-left: 3px solid #3498db;
        }

        .list-item-title {
            font-weight: 500;
            margin-bottom: 2px;
        }

        .list-item-details {
            font-size: 0.85em;
            color: ${theme === 'dark' ? '#aaa' : '#666'};
        }

        .info-panel {
            position: absolute;
            top: 20px;
            left: 20px;
            z-index: 1000;
            max-width: 350px;
            min-width: 280px;
            background: ${theme === 'dark' ? 'rgba(44, 62, 80, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
            backdrop-filter: blur(5px);
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            border-left: 4px solid #3498db;
            overflow: hidden;
            transition: all 0.3s ease;
        }

        .info-panel-header {
            padding: 12px 15px;
            background: ${theme === 'dark' ? '#2c3e50' : '#f0f7ff'};
            border-bottom: 1px solid ${theme === 'dark' ? '#3d5a73' : '#d4e6f1'};
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
        }

        .info-panel-header h3 {
            font-size: 14px;
            font-weight: 600;
            color: ${theme === 'dark' ? '#fff' : '#2c3e50'};
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .info-panel-close {
            background: none;
            border: none;
            color: ${theme === 'dark' ? '#aaa' : '#666'};
            cursor: pointer;
            font-size: 14px;
            padding: 4px;
            border-radius: 4px;
        }

        .info-panel-content {
            padding: 15px;
            max-height: 400px;
            overflow-y: auto;
            font-size: 13px;
            line-height: 1.5;
        }

        .info-panel-footer {
            padding: 10px 15px;
            background: ${theme === 'dark' ? '#2c3e50' : '#f8f9fa'};
            border-top: 1px solid ${theme === 'dark' ? '#3d5a73' : '#eee'};
            display: flex;
            gap: 8px;
        }

        .info-panel.minimized .info-panel-content,
        .info-panel.minimized .info-panel-footer {
            display: none;
        }

        .selection-status {
            padding: 12px;
            background: ${theme === 'dark' ? '#34495e' : '#fff3cd'};
            border-radius: 6px;
            margin-bottom: 15px;
            border-left: 4px solid #ffc107;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
        }

        .route-points {
            background: ${theme === 'dark' ? '#2c2c2c' : '#fff'};
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 12px;
            border: 1px solid ${theme === 'dark' ? '#555' : '#ddd'};
        }

        .route-point {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 0;
            font-size: 13px;
        }

        .route-point:first-child {
            border-bottom: 1px solid ${theme === 'dark' ? '#444' : '#eee'};
            margin-bottom: 6px;
            padding-bottom: 10px;
        }

        .route-point-icon {
            width: 26px;
            height: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            font-size: 12px;
        }

        .route-point-icon.start {
            background: #28a745;
            color: white;
        }

        .route-point-icon.end {
            background: #dc3545;
            color: white;
        }

        .route-point-info {
            flex: 1;
            font-weight: 500;
        }

        .route-point-empty {
            color: ${theme === 'dark' ? '#aaa' : '#999'};
            font-style: italic;
        }

        .map-selection-btn {
            background: #9b59b6;
            color: white;
            transition: all 0.3s;
        }

        .map-selection-btn:hover {
            background: #8e44ad;
        }

        .map-selection-btn.active {
            background: #f39c12;
            animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }

        .display-settings {
            display: none;
            padding: 12px;
            background: ${theme === 'dark' ? '#3a3a3a' : '#f8f9fa'};
            border-radius: 8px;
            margin-bottom: 15px;
        }
        
        .display-settings.active {
            display: block;
        }
        
        .setting-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            padding: 8px;
            background: ${theme === 'dark' ? '#2c2c2c' : '#fff'};
            border-radius: 6px;
            font-size: 13px;
        }
        
        .switch {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 22px;
        }
        
        .switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        
        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 22px;
        }
        
        .slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }
        
        input:checked + .slider {
            background-color: #3498db;
        }
        
        input:checked + .slider:before {
            transform: translateX(22px);
        }

        .mobile-routing-toggle {
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 1000;
            display: none;
            padding: 10px 16px;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        
        .mobile-routing-toggle.mobile-only {
            display: flex;
        }

        .mobile-routing-panel {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            width: 95%;
            max-width: 500px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 2000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
            transition: all 0.3s ease;
        }

        .mobile-routing-header {
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
            padding: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .mobile-routing-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 600;
            font-size: 16px;
        }
        
        .mobile-routing-close {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }
        
        .mobile-routing-close:hover {
            background: rgba(255,255,255,0.3);
        }
        
        .mobile-routing-content {
            padding: 20px;
        }
        
        .mobile-routing-status {
            background: #f8f9fa;
            padding: 12px 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            font-size: 14px;
            color: #333;
            border-left: 4px solid #3498db;
        }
        
        .mobile-routing-selection {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        
        .selected-point {
            flex: 1;
            background: #f8f9fa;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #e9ecef;
        }
        
        .selected-point-label {
            font-size: 12px;
            color: #6c757d;
            margin-bottom: 4px;
            font-weight: 500;
        }
        
        .selected-point-value {
            font-size: 14px;
            font-weight: 600;
            color: #212529;
            min-height: 20px;
        }
        
        .mobile-routing-controls {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .mobile-btn {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s;
        }
        
        .mobile-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .mobile-btn-primary {
            background: #3498db;
            color: white;
        }
        
        .mobile-btn-primary:not(:disabled):hover {
            background: #2980b9;
        }
        
        .mobile-btn-secondary {
            background: #6c757d;
            color: white;
        }
        
        .mobile-btn-secondary:not(:disabled):hover {
            background: #5a6268;
        }
        
        .mobile-btn-success {
            background: #28a745;
            color: white;
        }
        
        .mobile-btn-success:not(:disabled):hover {
            background: #218838;
        }
        
        .mobile-routing-instruction {
            background: #e7f5ff;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 12px;
            color: #0066cc;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .temp-marker {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 16px;
            box-shadow: 0 3px 8px rgba(0,0,0,0.3);
            border: 2px solid white;
            z-index: 1000 !important;
        }
        
        .temp-marker-start {
            background: #28a745;
        }
        
        .temp-marker-end {
            background: #dc3545;
        }

        .room-label {
            pointer-events: none !important;
            z-index: 1000 !important;
        }

        .room-label-content {
            background-color: rgba(255, 255, 255, 0.95) !important;
            padding: 8px 16px !important;
            border-radius: 8px !important;
            border: 2px solid #3498db !important;
            color: #333333 !important;
            font-weight: bold !important;
            font-size: 14px !important;
            text-align: center !important;
            white-space: normal !important;
            word-wrap: normal !important;
            word-break: keep-all !important;
            max-width: 350px !important;
            min-width: 100px !important;
            width: auto !important;
            height: auto !important;
            box-shadow: 0 3px 10px rgba(0,0,0,0.3) !important;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1) !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            line-height: 1.5 !important;
            display: inline-block !important;
            box-sizing: border-box !important;
        }

        .room-polygon {
            fill-opacity: 0 !important;
            stroke-opacity: 0 !important;
            cursor: pointer !important;
            transition: all 0.3s ease;
        }
        
        .room-polygon:hover {
            fill-opacity: 0.15 !important;
            stroke-opacity: 0.4 !important;
        }
        
        .room-polygon.selected-room {
            fill-opacity: 0.25 !important;
            stroke-opacity: 1 !important;
            stroke-width: 3 !important;
        }
        
        .room-polygon.selected-room-start {
            stroke: #28a745 !important;
            fill: #28a745 !important;
            fill-opacity: 0.3 !important;
        }
        
        .room-polygon.selected-room-end {
            stroke: #dc3545 !important;
            fill: #dc3545 !important;
            fill-opacity: 0.3 !important;
        }

        .custom-marker {
            transition: transform 0.2s ease;
        }
        
        .custom-marker:hover {
            transform: scale(1.15);
        }

        .route-info {
            background: ${theme === 'dark' ? '#27ae60' : '#d5f4e6'};
            padding: 12px;
            border-radius: 6px;
            margin-top: 12px;
            display: none;
            font-size: 13px;
        }

        .route-info.active {
            display: block;
        }

        @media (max-width: 768px) {
            .container {
                flex-direction: column;
            }
            
            .control-panel {
                width: 100%;
                max-width: 100%;
                height: 40vh;
                border-left: none;
                border-top: 2px solid ${theme === 'dark' ? '#444' : '#ddd'};
            }
            
            .info-panel {
                max-width: 90%;
                left: 5%;
                top: 10px;
            }
            
            .mobile-routing-toggle {
                display: flex !important;
            }
            
            .route-section {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="map-container">
            <div id="map"></div>
            
            <div class="info-panel" id="info-panel">
                <div class="info-panel-header" id="info-panel-header">
                    <h3>
                        <i class="fas fa-info-circle"></i>
                        <span id="info-panel-title">Информация</span>
                    </h3>
                    <button class="info-panel-close" id="info-panel-close">
                        <i class="fas fa-minus"></i>
                    </button>
                </div>
                <div class="info-panel-content" id="info-panel-content">
                    <p style="text-align: center; color: #666;">
                        <i class="fas fa-door-closed"></i><br>
                        Нажмите на кабинет или точку интереса,<br>чтобы увидеть информацию
                    </p>
                </div>
                <div class="info-panel-footer" id="info-panel-footer" style="display: none;"></div>
            </div>
            
            <button id="mobile-routing-toggle" class="btn btn-primary mobile-routing-toggle mobile-only">
                <i class="fas fa-route"></i> Мобильная маршрутизация
            </button>
        </div>

        <div class="control-panel">
            <div class="panel-header">
                <h1><i class="fas fa-map-marked-alt"></i> ${this.escapeHtml(title)}</h1>
                <div class="subtitle">${this.escapeHtml(description)}</div>
                <button id="toggle-settings" class="btn" style="margin-top: 8px; padding: 6px 12px; font-size: 12px; background: #9b59b6; color: white;">
                    <i class="fas fa-cog"></i> Настройки
                </button>
            </div>
            
            <div class="panel-content">
                <div class="display-settings" id="display-settings">
                    <div class="section-title">
                        <i class="fas fa-eye"></i> Настройки отображения
                    </div>
                    <div class="setting-item">
                        <span class="setting-label">Подписи кабинетов</span>
                        <label class="switch">
                            <input type="checkbox" id="setting-room-labels" checked>
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div class="setting-item">
                        <span class="setting-label">Точки интереса</span>
                        <label class="switch">
                            <input type="checkbox" id="setting-interest" checked>
                            <span class="slider"></span>
                        </label>
                    </div>
                    <button id="apply-settings" class="btn btn-primary btn-block" style="margin-top: 10px;">
                        <i class="fas fa-check"></i> Применить
                    </button>
                </div>

                <div class="section">
                    <div class="section-title">
                        <i class="fas fa-search"></i> Поиск
                    </div>
                    
                    <div class="form-group">
                        <input type="text" id="room-search" class="form-control" 
                               placeholder="Введите название кабинета или точки интереса...">
                    </div>

                    <div class="list-container" id="search-results">
                        <div style="padding: 15px; text-align: center; color: #666; font-size: 12px;">
                            <i class="fas fa-building"></i><br>
                            Начните вводить для поиска
                        </div>
                    </div>
                </div>

                <div class="section route-section">
                    <div class="section-title">
                        <i class="fas fa-route"></i> Построение маршрута
                    </div>

                    <div class="selection-status" id="selection-status">
                        <i class="fas fa-info-circle"></i>
                        <span id="status-text">Нажмите "Выбрать на карте"</span>
                    </div>

                    <div class="route-points">
                        <div class="route-point" id="route-start-point">
                            <div class="route-point-icon start">
                                <i class="fas fa-play"></i>
                            </div>
                            <div class="route-point-info" id="route-start-text">
                                <span class="route-point-empty">Не выбрано</span>
                            </div>
                        </div>
                        
                        <div class="route-point" id="route-end-point">
                            <div class="route-point-icon end">
                                <i class="fas fa-flag-checkered"></i>
                            </div>
                            <div class="route-point-info" id="route-end-text">
                                <span class="route-point-empty">Не выбрано</span>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <button id="select-on-map-btn" class="btn btn-block map-selection-btn">
                            <i class="fas fa-mouse-pointer"></i> <span id="select-btn-text">Выбрать на карте</span>
                        </button>
                        
                        <div style="display: flex; gap: 8px; margin-top: 8px;">
                            <button id="find-route-btn" class="btn btn-primary" style="flex: 2;" disabled>
                                <i class="fas fa-route"></i> Построить
                            </button>
                            <button id="clear-route-btn" class="btn btn-danger" style="flex: 1;">
                                <i class="fas fa-times"></i> Сброс
                            </button>
                        </div>
                    </div>

                    <div class="route-info" id="route-info"></div>
                </div>
            </div>

            <div class="status-bar">
                <span id="status">Готов</span>
                <span id="stats">Кабинеты: ${rooms.length}</span>
            </div>
        </div>
    </div>

    <div id="mobile-routing-panel" class="mobile-routing-panel" style="display: none;">
        <div class="mobile-routing-header">
            <div class="mobile-routing-title">
                <i class="fas fa-route"></i>
                <span>Мобильная маршрутизация</span>
            </div>
            <button id="mobile-routing-close" class="mobile-routing-close">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div class="mobile-routing-content">
            <div class="mobile-routing-status" id="mobile-routing-status">
                Готово. Нажмите "Начать выбор" для построения маршрута.
            </div>
            
            <div class="mobile-routing-selection">
                <div class="selected-point" id="mobile-selected-start">
                    <div class="selected-point-label">От:</div>
                    <div class="selected-point-value" id="mobile-start-value">не выбрано</div>
                </div>
                <div class="selected-point" id="mobile-selected-end">
                    <div class="selected-point-label">До:</div>
                    <div class="selected-point-value" id="mobile-end-value">не выбрано</div>
                </div>
            </div>
            
            <div class="mobile-routing-controls">
                <button id="mobile-start-btn" class="mobile-btn mobile-btn-primary">
                    <i class="fas fa-play"></i> Начать выбор
                </button>
                <button id="mobile-clear-btn" class="mobile-btn mobile-btn-secondary" disabled>
                    <i class="fas fa-times"></i> Сбросить
                </button>
                <button id="mobile-find-btn" class="mobile-btn mobile-btn-success" disabled>
                    <i class="fas fa-search"></i> Найти маршрут
                </button>
            </div>
            
            <div class="mobile-routing-instruction" id="mobile-routing-instruction">
                <i class="fas fa-info-circle"></i>
                <span>Для выбора точки нажмите на кабинет или точку интереса</span>
            </div>
        </div>
    </div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    
    <script>
        const mapData = {
            rooms: ${JSON.stringify(rooms)},
            points: ${JSON.stringify(points)},
            connections: ${JSON.stringify(connections)},
            graph: ${JSON.stringify(graphData)}
        };
        
        const theme = '${theme}';
        const displayOptions = ${JSON.stringify(displayOptions)};

        class OfficeMapViewer {
            constructor() {
                this.map = null;
                this.rooms = mapData.rooms;
                this.points = mapData.points;
                this.connections = mapData.connections;
                this.graph = mapData.graph;
                
                this.displayOptions = { ...displayOptions };
                
                this.roomLayers = {};
                this.roomLabels = {};
                this.pointMarkers = {};
                this.connectionLines = {};
                this.currentRoute = null;
                this.highlightedRooms = []; // Для хранения подсвеченных полигонов маршрута
                this.selectedRooms = { start: null, end: null };
                
                this.layerGroups = {
                    rooms: L.layerGroup(),
                    roomLabels: L.layerGroup(),
                    points: L.layerGroup(),
                    connections: L.layerGroup(),
                    route: L.layerGroup()
                };
                
                this.routeFrom = null;
                this.routeTo = null;
                this.selectionMode = null;
                this.tempMarkers = [];
                
                this.mobileRouting = null;
                
                this.init();
            }

            init() {
                console.log('Инициализация веб-интерфейса...');
                
                this.initMap();
                this.initUI();
                this.loadObjectsToMap();
                this.initInfoPanel();
                this.updateStatus('Карта загружена');
                
                this.mobileRouting = new MobileRoutingUI(this);
            }

            initMap() {
                try {
                    this.map = L.map('map').setView([540, 960], 0);
                    this.map.options.crs = L.CRS.Simple;
                    
                    const bounds = [[0, 0], [1080, 1920]];
                    this.map.setMaxBounds(bounds);
                    this.map.fitBounds(bounds);
                    
                    this.loadMapImage();
                    
                    Object.values(this.layerGroups).forEach(group => {
                        group.addTo(this.map);
                    });
                    
                } catch (error) {
                    console.error('Ошибка инициализации карты:', error);
                    this.showNotification('Ошибка загрузки карты', 'error');
                }
            }

            loadMapImage() {
                const testImage = new Image();
                testImage.onload = () => {
                    const imageBounds = [[0, 0], [testImage.height, testImage.width]];
                    L.imageOverlay('plan.png', imageBounds).addTo(this.map);
                    this.map.setMaxBounds(imageBounds);
                    this.map.fitBounds(imageBounds);
                };
                
                testImage.onerror = () => {
                    this.createTestBackground();
                };
                
                testImage.src = 'plan.png';
            }

            createTestBackground() {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = 1920;
                    canvas.height = 1080;
                    const ctx = canvas.getContext('2d');
                    
                    ctx.fillStyle = theme === 'dark' ? '#2d2d2d' : '#f0f0f0';
                    ctx.fillRect(0, 0, 1920, 1080);
                    
                    ctx.strokeStyle = theme === 'dark' ? '#444' : '#d0d0d0';
                    ctx.lineWidth = 1;
                    
                    for (let x = 0; x <= 1920; x += 100) {
                        ctx.beginPath();
                        ctx.moveTo(x, 0);
                        ctx.lineTo(x, 1080);
                        ctx.stroke();
                    }
                    
                    for (let y = 0; y <= 1080; y += 100) {
                        ctx.beginPath();
                        ctx.moveTo(0, y);
                        ctx.lineTo(1080, y);
                        ctx.stroke();
                    }
                    
                    ctx.fillStyle = '#3498db';
                    ctx.font = 'bold 48px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('ОФИСНЫЙ ПЛАН', 960, 200);
                    
                    ctx.fillStyle = '#666';
                    ctx.font = '24px Arial';
                    ctx.fillText('Добавьте файл plan.png в папку с картой', 960, 250);
                    
                    const dataURL = canvas.toDataURL('image/png');
                    L.imageOverlay(dataURL, [[0, 0], [1080, 1920]]).addTo(this.map);
                    
                } catch (error) {
                    console.error('Ошибка создания тестовой подложки:', error);
                }
            }

            initInfoPanel() {
                const header = document.getElementById('info-panel-header');
                const closeBtn = document.getElementById('info-panel-close');
                const panel = document.getElementById('info-panel');
                
                if (header) {
                    header.addEventListener('click', (e) => {
                        if (e.target !== closeBtn) {
                            panel.classList.toggle('minimized');
                            const icon = closeBtn.querySelector('i');
                            icon.className = panel.classList.contains('minimized') ? 'fas fa-plus' : 'fas fa-minus';
                        }
                    });
                }
                
                if (closeBtn) {
                    closeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        panel.classList.toggle('minimized');
                        const icon = closeBtn.querySelector('i');
                        icon.className = panel.classList.contains('minimized') ? 'fas fa-plus' : 'fas fa-minus';
                    });
                }
            }

            updateInfoPanel(item) {
                const titleEl = document.getElementById('info-panel-title');
                const contentEl = document.getElementById('info-panel-content');
                const footerEl = document.getElementById('info-panel-footer');
                const panel = document.getElementById('info-panel');
                
                if (!item) {
                    titleEl.innerHTML = 'Информация';
                    contentEl.innerHTML = '<p style="text-align: center; color: #666;"><i class="fas fa-door-closed"></i><br>Нажмите на кабинет или точку интереса,<br>чтобы увидеть информацию</p>';
                    footerEl.style.display = 'none';
                    return;
                }
                
                if (item.type === 'room') {
                    this.showRoomInfo(item.data, titleEl, contentEl, footerEl);
                } else {
                    this.showPointInfo(item.data, titleEl, contentEl, footerEl);
                }
                
                if (panel.classList.contains('minimized')) {
                    panel.classList.remove('minimized');
                    const icon = document.querySelector('#info-panel-close i');
                    if (icon) icon.className = 'fas fa-minus';
                }
            }

            showRoomInfo(room, titleEl, contentEl, footerEl) {
                titleEl.innerHTML = 'Кабинет ' + this.escapeHtml(room.name);
                
                let html = '';
                if (room.department) html += '<p><strong><i class="fas fa-users"></i> Отдел:</strong> ' + this.escapeHtml(room.department) + '</p>';
                if (room.employees) html += '<p><strong><i class="fas fa-user-tie"></i> Сотрудники:</strong> ' + this.escapeHtml(room.employees) + '</p>';
                if (room.phone) html += '<p><strong><i class="fas fa-phone"></i> Телефон:</strong> ' + this.escapeHtml(room.phone) + '</p>';
                
                const roomPoints = this.points.filter(p => p.roomId === room.id && p.type === 'point_of_interest');
                if (roomPoints.length > 0) {
                    html += '<p><strong><i class="fas fa-star"></i> Точки интереса:</strong><br>';
                    roomPoints.forEach(p => {
                        html += '&nbsp;&nbsp;📍 ' + this.escapeHtml(p.name) + '<br>';
                    });
                    html += '</p>';
                }
                
                contentEl.innerHTML = html;
                
                footerEl.style.display = 'flex';
                footerEl.innerHTML = \`
                    <button class="btn btn-success btn-small" style="flex:1; padding:6px;" onclick="window.mapViewer.selectRoomForRoute('\${room.id}', 'start')">
                        <i class="fas fa-play"></i> Отсюда
                    </button>
                    <button class="btn btn-danger btn-small" style="flex:1; padding:6px;" onclick="window.mapViewer.selectRoomForRoute('\${room.id}', 'end')">
                        <i class="fas fa-flag"></i> Сюда
                    </button>
                \`;
            }

            showPointInfo(point, titleEl, contentEl, footerEl) {
                titleEl.innerHTML = '<i class="fas fa-star" style="color: ' + point.color + ';"></i> ' + this.escapeHtml(point.name);
                
                const room = point.roomId ? this.rooms.find(r => r.id === point.roomId) : null;
                
                let html = '<p><strong>Тип:</strong> 📍 Точка интереса</p>';
                
                if (room) {
                    html += '<p><strong><i class="fas fa-door-closed"></i> Кабинет:</strong> ' + this.escapeHtml(room.name) + '</p>';
                    if (room.department) {
                        html += '<p><small>' + this.escapeHtml(room.department) + '</small></p>';
                    }
                }
                
                html += '<p><small>Координаты: ' + point.y.toFixed(0) + ', ' + point.x.toFixed(0) + '</small></p>';
                
                contentEl.innerHTML = html;
                
                footerEl.style.display = 'flex';
                footerEl.innerHTML = \`
                    <button class="btn btn-success btn-small" style="flex:1; padding:6px;" onclick="window.mapViewer.selectPointForRoute('\${point.id}', 'start')">
                        <i class="fas fa-play"></i> Отсюда
                    </button>
                    <button class="btn btn-danger btn-small" style="flex:1; padding:6px;" onclick="window.mapViewer.selectPointForRoute('\${point.id}', 'end')">
                        <i class="fas fa-flag"></i> Сюда
                    </button>
                \`;
            }

            loadObjectsToMap() {
                this.clearAllObjects();
                
                this.rooms.forEach(room => {
                    this.addRoomToMap(room);
                });
                
                if (this.displayOptions.showRoomLabels) {
                    this.addRoomLabels();
                }
                
                const pointsToShow = this.points.filter(point => {
                    return point.type === 'point_of_interest' && point.isRouting !== false;
                });
                
                console.log('Загружено точек интереса для отображения:', pointsToShow.length);
                
                pointsToShow.forEach(point => {
                    this.addPointToMap(point);
                });
            }

            clearAllObjects() {
                Object.values(this.layerGroups).forEach(group => {
                    group.clearLayers();
                });
                
                this.roomLayers = {};
                this.roomLabels = {};
                this.pointMarkers = {};
                this.connectionLines = {};
            }

            addRoomToMap(room) {
                if (!room.vertices || room.vertices.length < 3) return;
                
                const polygon = L.polygon(room.vertices, {
                    color: room.color || '#3498db',
                    fillColor: room.color || '#3498db',
                    fillOpacity: 0,
                    weight: 2,
                    opacity: 0,
                    className: 'room-polygon'
                }).addTo(this.layerGroups.rooms);
                
                polygon.on('click', () => {
                    this.handleRoomClick(room);
                });
                
                this.roomLayers[room.id] = polygon;
            }
            
            addRoomLabels() {
                this.rooms.forEach(room => {
                    let sumY = 0, sumX = 0;
                    room.vertices.forEach(v => {
                        sumY += v[0];
                        sumX += v[1];
                    });
                    const center = [sumY / room.vertices.length, sumX / room.vertices.length];
                    
                    const label = L.marker(center, {
                        icon: L.divIcon({
                            className: 'room-label',
                            html: '<div class="room-label-content">' + this.escapeHtml(room.name) + '</div>',
                            iconSize: null,
                            iconAnchor: [0, 0]
                        }),
                        interactive: false
                    }).addTo(this.layerGroups.roomLabels);
                    
                    this.roomLabels[room.id] = label;
                });
            }

            addPointToMap(point) {
                if (point.type !== 'point_of_interest') {
                    return;
                }
                
                const icon = L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="' +
                        'background-color: ' + point.color + ';' +
                        'width: 24px;' +
                        'height: 24px;' +
                        'border-radius: 50%;' +
                        'border: 2px solid white;' +
                        'box-shadow: 0 2px 5px rgba(0,0,0,0.3);' +
                        'display: flex;' +
                        'align-items: center;' +
                        'justify-content: center;' +
                        'color: white;' +
                        'font-size: 12px;' +
                        'cursor: pointer;' +
                        'transition: all 0.2s ease;' +
                        '">' +
                        '<i class="fas fa-star"></i>' +
                        '</div>',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                });
                
                const marker = L.marker([point.y, point.x], {
                    icon: icon,
                    pointId: point.id,
                    point: point
                }).addTo(this.layerGroups.points);
                
                const room = point.roomId ? this.rooms.find(r => r.id === point.roomId) : null;
                let roomInfo = '';
                if (room) {
                    roomInfo = \`
                        <div style="margin: 10px 0; padding: 8px; background: #e8f4fc; border-radius: 4px;">
                            <strong><i class="fas fa-door-closed"></i> Кабинет:</strong><br>
                            \${this.escapeHtml(room.name)}
                            \${room.department ? '<br><small>' + this.escapeHtml(room.department) + '</small>' : ''}
                        </div>
                    \`;
                }
                
                const popupContent = \`
                    <div style="padding: 15px; min-width: 200px;">
                        <h4 style="margin: 0 0 10px 0; color: \${point.color}; border-bottom: 2px solid \${point.color}; padding-bottom: 5px;">
                            <i class="fas fa-star"></i> \${this.escapeHtml(point.name)}
                        </h4>
                        \${roomInfo}
                        <div style="margin: 10px 0; font-size: 12px; color: #666;">
                            <strong>Тип:</strong> 📍 Точка интереса<br>
                            \${point.isRouting ? '<span style="color: #27ae60;">✓ Участвует в маршрутизации</span>' : ''}
                        </div>
                        <div style="display: flex; gap: 5px; margin-top: 10px;">
                            <button onclick="window.mapViewer.selectPointForRoute('\${point.id}', 'start')" 
                                    style="flex: 1; padding: 8px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                <i class="fas fa-play"></i> Отсюда
                            </button>
                            <button onclick="window.mapViewer.selectPointForRoute('\${point.id}', 'end')" 
                                    style="flex: 1; padding: 8px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                <i class="fas fa-flag"></i> Сюда
                            </button>
                        </div>
                    </div>
                \`;
                
                marker.bindPopup(popupContent);
                
                marker.on('click', (e) => {
                    this.handlePointClick(point);
                    L.DomEvent.stopPropagation(e);
                });
                
                this.pointMarkers[point.id] = marker;
            }

            handleRoomClick(room) {
                this.updateInfoPanel({ type: 'room', data: room });
                
                const entrancePoint = this.points.find(p => 
                    p.roomId === room.id && p.type === 'entrance'
                );
                
                if (!entrancePoint) {
                    this.showNotification('Для этого кабинета не указана точка входа', 'warning');
                    return;
                }
                
                if (this.selectionMode === 'select-start') {
                    this.setRoutePoint(entrancePoint.id, 'start');
                    this.highlightSelectedRoom(room.id, 'start');
                    this.selectionMode = 'select-end';
                    this.updateSelectionStatus();
                    this.showNotification('Начальная точка выбрана', 'success');
                    
                } else if (this.selectionMode === 'select-end') {
                    this.setRoutePoint(entrancePoint.id, 'end');
                    this.highlightSelectedRoom(room.id, 'end');
                    this.selectionMode = null;
                    this.updateSelectionStatus();
                    this.showNotification('Конечная точка выбрана', 'success');
                    
                    if (this.routeFrom && this.routeTo) {
                        setTimeout(() => this.findRoute(), 100);
                    }
                }
            }

            handlePointClick(point) {
                if (point.type !== 'point_of_interest') {
                    return;
                }
                
                this.updateInfoPanel({ type: 'point', data: point });
                
                if (this.selectionMode === 'select-start') {
                    this.setRoutePoint(point.id, 'start');
                    if (point.roomId) this.highlightSelectedRoom(point.roomId, 'start');
                    this.selectionMode = 'select-end';
                    this.updateSelectionStatus();
                    this.showNotification('Начальная точка: ' + point.name, 'success');
                    
                } else if (this.selectionMode === 'select-end') {
                    this.setRoutePoint(point.id, 'end');
                    if (point.roomId) this.highlightSelectedRoom(point.roomId, 'end');
                    this.selectionMode = null;
                    this.updateSelectionStatus();
                    this.showNotification('Конечная точка: ' + point.name, 'success');
                    
                    if (this.routeFrom && this.routeTo) {
                        setTimeout(() => this.findRoute(), 100);
                    }
                }
            }

            setRoutePoint(pointId, type) {
                const point = this.points.find(p => p.id === pointId);
                if (!point) return;
                
                this.tempMarkers = this.tempMarkers.filter(item => {
                    if (item.type === type) {
                        this.map.removeLayer(item.marker);
                        return false;
                    }
                    return true;
                });
                
                if (type === 'start') {
                    this.routeFrom = point;
                } else {
                    this.routeTo = point;
                }
                
                this.addTempMarker(point, type);
                this.updateRouteDisplay();
                
                document.getElementById('find-route-btn').disabled = !(this.routeFrom && this.routeTo);
            }

            addTempMarker(point, type) {
                try {
                    const icon = L.divIcon({
                        className: 'temp-marker temp-marker-' + type,
                        html: type === 'start' ? '<i class="fas fa-play"></i>' : '<i class="fas fa-flag-checkered"></i>',
                        iconSize: [36, 36],
                        iconAnchor: [18, 18]
                    });
                    
                    const marker = L.marker([point.y, point.x], {
                        icon: icon,
                        interactive: false,
                        zIndexOffset: 1000
                    }).addTo(this.map);
                    
                    this.tempMarkers.push({ marker, type });
                } catch (error) {
                    console.error('Ошибка при добавлении маркера:', error);
                }
            }

            clearTempMarkers() {
                this.tempMarkers.forEach(item => {
                    if (item.marker && this.map.hasLayer(item.marker)) {
                        this.map.removeLayer(item.marker);
                    }
                });
                this.tempMarkers = [];
            }

            /**
             * ИСПРАВЛЕННЫЙ МЕТОД: правильная подсветка кабинета с удалением старых классов
             */
            highlightSelectedRoom(roomId, type) {
                // Удаляем предыдущую подсветку для этого типа
                if (this.selectedRooms[type] && this.roomLayers[this.selectedRooms[type]]) {
                    const prevElement = this.roomLayers[this.selectedRooms[type]].getElement();
                    if (prevElement) {
                        prevElement.classList.remove('selected-room', 'selected-room-start', 'selected-room-end');
                    }
                }
                
                if (roomId && this.roomLayers[roomId]) {
                    const element = this.roomLayers[roomId].getElement();
                    if (element) {
                        element.classList.add('selected-room');
                        element.classList.add(type === 'start' ? 'selected-room-start' : 'selected-room-end');
                        this.selectedRooms[type] = roomId;
                    }
                }
            }

            /**
             * НОВЫЙ МЕТОД: очистка подсветки всех кабинетов
             */
            clearRoomHighlights() {
                // Удаляем CSS-классы со всех полигонов
                Object.values(this.roomLayers).forEach(layer => {
                    const element = layer.getElement();
                    if (element) {
                        element.classList.remove('selected-room', 'selected-room-start', 'selected-room-end');
                    }
                });
                
                // Сбрасываем выбранные комнаты
                this.selectedRooms = { start: null, end: null };
                
                console.log('Подсветка кабинетов очищена');
            }

            /**
             * НОВЫЙ МЕТОД: очистка подсветки маршрута (полигонов на пути)
             */
            clearRouteHighlights() {
                this.highlightedRooms.forEach(polygon => {
                    if (polygon && this.map.hasLayer(polygon)) {
                        polygon.remove();
                    }
                });
                this.highlightedRooms = [];
            }

            selectRoomForRoute(roomId, type) {
                const room = this.rooms.find(r => r.id === roomId);
                if (!room) return;
                
                const entrancePoint = this.points.find(p => 
                    p.roomId === roomId && p.type === 'entrance'
                );
                
                if (entrancePoint) {
                    this.setRoutePoint(entrancePoint.id, type);
                    this.highlightSelectedRoom(roomId, type);
                    
                    if (this.routeFrom && this.routeTo) {
                        this.findRoute();
                    } else {
                        this.selectionMode = type === 'start' ? 'select-end' : 'select-start';
                        this.updateSelectionStatus();
                    }
                } else {
                    this.showNotification('Для этого кабинета не указана точка входа', 'warning');
                }
            }

            selectPointForRoute(pointId, type) {
                const point = this.points.find(p => p.id === pointId);
                if (!point) return;
                
                this.setRoutePoint(point.id, type);
                
                if (point.roomId) {
                    this.highlightSelectedRoom(point.roomId, type);
                }
                
                if (this.routeFrom && this.routeTo) {
                    this.findRoute();
                } else {
                    this.selectionMode = type === 'start' ? 'select-end' : 'select-start';
                    this.updateSelectionStatus();
                }
            }

            updateRouteDisplay() {
                const startText = document.getElementById('route-start-text');
                const endText = document.getElementById('route-end-text');
                
                if (startText) {
                    if (this.routeFrom) {
                        const room = this.routeFrom.roomId ? this.rooms.find(r => r.id === this.routeFrom.roomId) : null;
                        let displayName = this.routeFrom.name;
                        if (room) displayName = room.name;
                        if (this.routeFrom.type === 'point_of_interest') {
                            displayName = '📍 ' + this.routeFrom.name;
                        }
                        startText.innerHTML = '<span>' + this.escapeHtml(displayName) + '</span>';
                    } else {
                        startText.innerHTML = '<span class="route-point-empty">Не выбрано</span>';
                    }
                }
                
                if (endText) {
                    if (this.routeTo) {
                        const room = this.routeTo.roomId ? this.rooms.find(r => r.id === this.routeTo.roomId) : null;
                        let displayName = this.routeTo.name;
                        if (room) displayName = room.name;
                        if (this.routeTo.type === 'point_of_interest') {
                            displayName = '📍 ' + this.routeTo.name;
                        }
                        endText.innerHTML = '<span>' + this.escapeHtml(displayName) + '</span>';
                    } else {
                        endText.innerHTML = '<span class="route-point-empty">Не выбрано</span>';
                    }
                }
            }

            initUI() {
                const toggleSettingsBtn = document.getElementById('toggle-settings');
                const settingsSection = document.getElementById('display-settings');
                
                if (toggleSettingsBtn && settingsSection) {
                    toggleSettingsBtn.addEventListener('click', () => {
                        const isActive = settingsSection.classList.toggle('active');
                        toggleSettingsBtn.innerHTML = isActive ? 
                            '<i class="fas fa-times"></i> Скрыть' : 
                            '<i class="fas fa-cog"></i> Настройки';
                    });
                }
                
                this.initDisplaySettings();
                
                const searchInput = document.getElementById('room-search');
                if (searchInput) {
                    searchInput.addEventListener('input', (e) => {
                        this.searchItems(e.target.value);
                    });
                }
                
                const selectOnMapBtn = document.getElementById('select-on-map-btn');
                if (selectOnMapBtn) {
                    selectOnMapBtn.addEventListener('click', () => {
                        this.toggleSelectionMode();
                    });
                }
                
                const findRouteBtn = document.getElementById('find-route-btn');
                if (findRouteBtn) {
                    findRouteBtn.addEventListener('click', () => {
                        this.findRoute();
                    });
                }
                
                const clearRouteBtn = document.getElementById('clear-route-btn');
                if (clearRouteBtn) {
                    clearRouteBtn.addEventListener('click', () => {
                        this.clearRoute();
                    });
                }
                
                const applySettingsBtn = document.getElementById('apply-settings');
                if (applySettingsBtn) {
                    applySettingsBtn.addEventListener('click', () => {
                        this.applyDisplaySettings();
                    });
                }
            }

            initDisplaySettings() {
                document.getElementById('setting-room-labels').checked = this.displayOptions.showRoomLabels;
                document.getElementById('setting-interest').checked = this.displayOptions.showInterestPoints;
                
                this.updateLayersVisibility();
            }
            
            updateLayersVisibility() {
                if (this.displayOptions.showRoomLabels) {
                    this.map.addLayer(this.layerGroups.roomLabels);
                } else {
                    this.map.removeLayer(this.layerGroups.roomLabels);
                }
                
                if (this.displayOptions.showInterestPoints) {
                    this.map.addLayer(this.layerGroups.points);
                } else {
                    this.map.removeLayer(this.layerGroups.points);
                }
                
                this.map.addLayer(this.layerGroups.rooms);
            }

            applyDisplaySettings() {
                this.displayOptions = {
                    showRoomLabels: document.getElementById('setting-room-labels').checked,
                    showInterestPoints: document.getElementById('setting-interest').checked,
                    showRooms: true,
                    showEntrancePoints: false,
                    showConnectionPoints: false,
                    showConnectionLines: false
                };
                
                this.loadObjectsToMap();
                this.updateLayersVisibility();
                
                if (this.currentRoute) {
                    this.redrawRoute();
                }
                
                this.showNotification('Настройки применены', 'success');
                
                document.getElementById('display-settings').classList.remove('active');
                document.getElementById('toggle-settings').innerHTML = '<i class="fas fa-cog"></i> Настройки';
            }

            redrawRoute() {
                if (this.routeFrom && this.routeTo) {
                    const fromId = this.routeFrom.id;
                    const toId = this.routeTo.id;
                    this.clearRoute();
                    this.setRoutePoints(fromId, toId);
                    this.findRoute();
                }
            }

            toggleSelectionMode() {
                if (this.selectionMode) {
                    this.selectionMode = null;
                    this.clearTempMarkers();
                    this.updateSelectionStatus();
                } else {
                    this.selectionMode = 'select-start';
                    this.clearTempMarkers();
                    this.updateSelectionStatus();
                    this.showNotification('Кликните на кабинет или точку интереса, чтобы выбрать начало', 'info');
                }
            }

            updateSelectionStatus() {
                const statusElement = document.getElementById('selection-status');
                const statusText = document.getElementById('status-text');
                const selectBtn = document.getElementById('select-on-map-btn');
                const selectBtnText = document.getElementById('select-btn-text');
                
                if (!this.selectionMode) {
                    statusElement.style.background = theme === 'dark' ? '#34495e' : '#fff3cd';
                    statusElement.style.borderLeftColor = '#ffc107';
                    statusText.innerHTML = 'Режим выбора отключен';
                    selectBtn.classList.remove('active');
                    selectBtnText.textContent = 'Выбрать на карте';
                } else if (this.selectionMode === 'select-start') {
                    statusElement.style.background = '#d4edda';
                    statusElement.style.borderLeftColor = '#28a745';
                    statusText.innerHTML = 'Выберите НАЧАЛЬНУЮ точку (кабинет или точка интереса)';
                    selectBtn.classList.add('active');
                    selectBtnText.textContent = 'Отменить';
                } else if (this.selectionMode === 'select-end') {
                    statusElement.style.background = '#f8d7da';
                    statusElement.style.borderLeftColor = '#dc3545';
                    statusText.innerHTML = 'Выберите КОНЕЧНУЮ точку (кабинет или точка интереса)';
                    selectBtn.classList.add('active');
                    selectBtnText.textContent = 'Отменить';
                }
            }

            searchItems(query) {
                const resultsContainer = document.getElementById('search-results');
                if (!resultsContainer) return;
                
                if (!query.trim()) {
                    resultsContainer.innerHTML = '<div style="padding: 15px; text-align: center; color: #666;"><i class="fas fa-building"></i><br>Начните вводить для поиска</div>';
                    return;
                }
                
                const roomResults = this.rooms.filter(room => {
                    const text = query.toLowerCase();
                    return room.name.toLowerCase().includes(text) ||
                           (room.department && room.department.toLowerCase().includes(text));
                }).map(room => ({ type: 'room', data: room }));
                
                const pointResults = this.points.filter(point => {
                    const text = query.toLowerCase();
                    return point.name.toLowerCase().includes(text) &&
                           point.type === 'point_of_interest';
                }).map(point => ({ type: 'point', data: point }));
                
                const searchResults = [...roomResults, ...pointResults];
                
                if (searchResults.length === 0) {
                    resultsContainer.innerHTML = '<div style="padding: 15px; text-align: center; color: #666;"><i class="fas fa-search"></i><br>Ничего не найдено</div>';
                    return;
                }
                
                resultsContainer.innerHTML = searchResults.map(item => {
                    if (item.type === 'room') {
                        return \`
                            <div class="list-item" onclick="window.mapViewer.selectRoom('\${item.data.id}')">
                                <div class="list-item-title">
                                    <i class="fas fa-door-closed" style="color: \${item.data.color || '#3498db'};"></i>
                                    \${this.escapeHtml(item.data.name)}
                                </div>
                                <div class="list-item-details">
                                    \${item.data.department ? this.escapeHtml(item.data.department) : 'Кабинет'}
                                </div>
                            </div>
                        \`;
                    } else {
                        return \`
                            <div class="list-item" onclick="window.mapViewer.selectPoint('\${item.data.id}')">
                                <div class="list-item-title">
                                    <i class="fas fa-star" style="color: \${item.data.color || '#3498db'};"></i>
                                    \${this.escapeHtml(item.data.name)}
                                </div>
                                <div class="list-item-details">
                                    Точка интереса
                                </div>
                            </div>
                        \`;
                    }
                }).join('');
            }

            selectRoom(roomId) {
                const room = this.rooms.find(r => r.id === roomId);
                if (!room) return;
                
                this.updateInfoPanel({ type: 'room', data: room });
                
                if (this.roomLayers[roomId]) {
                    const bounds = this.roomLayers[roomId].getBounds();
                    this.map.fitBounds(bounds);
                }
            }

            selectPoint(pointId) {
                const point = this.points.find(p => p.id === pointId);
                if (!point || point.type !== 'point_of_interest') return;
                
                this.updateInfoPanel({ type: 'point', data: point });
                this.map.setView([point.y, point.x], 1);
            }

            findRoute() {
                if (!this.routeFrom || !this.routeTo) {
                    this.showNotification('Выберите точки отправления и назначения', 'error');
                    return;
                }
                
                if (this.routeFrom.id === this.routeTo.id) {
                    this.showNotification('Точки отправления и назначения совпадают', 'warning');
                    return;
                }
                
                const result = this.findPathBFS(this.routeFrom.id, this.routeTo.id);
                
                if (result.success) {
                    this.showRoute(result.path);
                    this.showRouteInfo(result);
                    this.showNotification('Маршрут построен!', 'success');
                } else {
                    this.showNotification('Путь не найден: ' + (result.message || 'точки не соединены'), 'error');
                }
            }

            findPathBFS(startId, endId) {
                if (!this.graph[startId]) {
                    return { success: false, message: 'Стартовая точка не соединена с другими точками' };
                }
                
                const queue = [startId];
                const visited = { [startId]: true };
                const prev = { [startId]: null };
                
                while (queue.length > 0) {
                    const current = queue.shift();
                    
                    if (current === endId) {
                        const path = [];
                        let node = endId;
                        let totalLength = 0;
                        
                        while (node !== null) {
                            path.unshift(node);
                            node = prev[node];
                        }
                        
                        for (let i = 0; i < path.length - 1; i++) {
                            const from = path[i];
                            const to = path[i + 1];
                            
                            const connection = this.connections.find(conn => 
                                (conn.from === from && conn.to === to) ||
                                (conn.from === to && conn.to === from)
                            );
                            
                            if (connection) {
                                totalLength += connection.length;
                            }
                        }
                        
                        return {
                            success: true,
                            path: path,
                            length: totalLength,
                            nodes: path.map(id => this.points.find(p => p.id === id))
                        };
                    }
                    
                    if (this.graph[current]) {
                        for (const neighbor of this.graph[current]) {
                            if (!visited[neighbor.node]) {
                                visited[neighbor.node] = true;
                                prev[neighbor.node] = current;
                                queue.push(neighbor.node);
                            }
                        }
                    }
                }
                
                return { success: false, message: 'Путь не найден' };
            }

            /**
             * ИСПРАВЛЕННЫЙ МЕТОД: показ маршрута с очисткой предыдущей подсветки
             */
            showRoute(path) {
                if (this.currentRoute) {
                    this.currentRoute.remove();
                    this.currentRoute = null;
                }
                
                // Очищаем предыдущие подсветки кабинетов маршрута
                this.clearRouteHighlights();
                this.layerGroups.route.clearLayers();
                
                if (path.length < 2) return;
                
                const coordinates = [];
                const roomsToHighlight = new Set();
                
                path.forEach(pointId => {
                    const point = this.points.find(p => p.id === pointId);
                    if (point) {
                        coordinates.push([point.y, point.x]);
                        if (point.roomId) roomsToHighlight.add(point.roomId);
                    }
                });
                
                roomsToHighlight.forEach(roomId => {
                    this.highlightRoom(roomId);
                });
                
                this.currentRoute = L.polyline(coordinates, {
                    color: '#27ae60',
                    weight: 6,
                    opacity: 0.9,
                    dashArray: '10, 10'
                }).addTo(this.layerGroups.route);
                
                this.map.fitBounds(this.currentRoute.getBounds());
            }

            /**
             * ИСПРАВЛЕННЫЙ МЕТОД: подсветка кабинета на маршруте
             */
            highlightRoom(roomId) {
                const room = this.rooms.find(r => r.id === roomId);
                if (!room || !room.vertices) return;
                
                const highlightedPolygon = L.polygon(room.vertices, {
                    color: '#f39c12',
                    fillColor: '#f39c12',
                    fillOpacity: 0.3,
                    weight: 4,
                    className: 'highlighted-room'
                }).addTo(this.map);
                
                this.highlightedRooms.push(highlightedPolygon);
            }

            /**
             * ИСПРАВЛЕННЫЙ МЕТОД: полная очистка маршрута
             */
            clearRoute() {
                console.log('Очистка маршрута...');
                
                // Удаляем линию маршрута
                if (this.currentRoute) {
                    this.currentRoute.remove();
                    this.currentRoute = null;
                }
                
                // Очищаем подсветку кабинетов маршрута
                this.clearRouteHighlights();
                
                // Очищаем CSS-классы с выбранных кабинетов (для старта и конца)
                this.clearRoomHighlights();
                
                // Очищаем слой маршрута
                this.layerGroups.route.clearLayers();
                
                // Сбрасываем выбранные точки
                this.routeFrom = null;
                this.routeTo = null;
                this.selectionMode = null;
                
                // Очищаем временные маркеры
                this.clearTempMarkers();
                
                // Обновляем отображение в UI
                this.updateRouteDisplay();
                this.updateSelectionStatus();
                
                // Блокируем кнопку построения маршрута
                document.getElementById('find-route-btn').disabled = true;
                
                // Очищаем информационную панель маршрута
                const routeInfoDiv = document.getElementById('route-info');
                if (routeInfoDiv) {
                    routeInfoDiv.innerHTML = '';
                    routeInfoDiv.classList.remove('active');
                }
                
                this.updateStatus('Маршрут очищен');
                this.showNotification('Маршрут сброшен', 'info');
            }

            updateStatus(message) {
                const statusElement = document.getElementById('status');
                if (statusElement) statusElement.textContent = message;
            }

            showNotification(message, type = 'info') {
                const colors = { info: '#3498db', success: '#2ecc71', warning: '#f39c12', error: '#e74c3c' };
                
                const notification = document.createElement('div');
                notification.style.cssText = \`
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: \${colors[type] || '#3498db'};
                    color: white;
                    padding: 10px 15px;
                    border-radius: 6px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 10000;
                    max-width: 280px;
                    font-size: 13px;
                    animation: slideIn 0.3s ease;
                \`;
                
                notification.innerHTML = \`
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas \${type === 'success' ? 'fa-check-circle' : 
                                      type === 'warning' ? 'fa-exclamation-triangle' : 
                                      type === 'error' ? 'fa-times-circle' : 'fa-info-circle'}"></i>
                        <span>\${this.escapeHtml(message)}</span>
                    </div>
                \`;
                
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.style.animation = 'slideOut 0.3s ease';
                    setTimeout(() => {
                        if (notification.parentNode) notification.parentNode.removeChild(notification);
                    }, 300);
                }, 3000);
            }

            escapeHtml(text) {
                if (text === undefined || text === null) return '';
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }
        }

        class MobileRoutingUI {
            constructor(mapViewer) {
                this.mapViewer = mapViewer;
                this.mode = null;
                this.selectedStart = null;
                this.selectedEnd = null;
                this.tempMarkers = [];
                
                console.log('Инициализация мобильной маршрутизации UI...');
                this.init();
            }
            
            init() {
                this.isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                
                this.setupEventListeners();
                this.updateVisibility();
                
                window.addEventListener('resize', () => {
                    this.isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                    this.updateVisibility();
                });
            }
            
            setupEventListeners() {
                const toggleBtn = document.getElementById('mobile-routing-toggle');
                if (toggleBtn) {
                    toggleBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.showPanel();
                    });
                }
                
                const startBtn = document.getElementById('mobile-start-btn');
                if (startBtn) {
                    startBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.startSelection();
                    });
                }
                
                const clearBtn = document.getElementById('mobile-clear-btn');
                if (clearBtn) {
                    clearBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.clearSelection();
                    });
                }
                
                const findBtn = document.getElementById('mobile-find-btn');
                if (findBtn) {
                    findBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.findRoute();
                    });
                }
                
                const closeBtn = document.getElementById('mobile-routing-close');
                if (closeBtn) {
                    closeBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.hidePanel();
                    });
                }
                
                this.mapViewer.map.on('click', (e) => {
                    if (this.mode && this.isMobile) {
                        this.handleMapClick(e.latlng);
                    }
                });
            }
            
            updateVisibility() {
                const mobileToggle = document.getElementById('mobile-routing-toggle');
                const routeSection = document.querySelector('.route-section');
                
                if (this.isMobile) {
                    if (mobileToggle) mobileToggle.style.display = 'flex';
                    if (routeSection) routeSection.style.display = 'none';
                } else {
                    if (mobileToggle) mobileToggle.style.display = 'none';
                    if (routeSection) routeSection.style.display = 'block';
                }
            }
            
            showPanel() {
                if (!this.isMobile) return;
                
                const panel = document.getElementById('mobile-routing-panel');
                if (panel) {
                    panel.style.display = 'block';
                    setTimeout(() => this.startSelection(), 100);
                }
            }
            
            hidePanel() {
                const panel = document.getElementById('mobile-routing-panel');
                if (panel) {
                    panel.style.display = 'none';
                    this.clearSelection();
                }
            }
            
            startSelection() {
                if (!this.isMobile) return;
                
                this.mode = 'select-start';
                this.selectedStart = null;
                this.selectedEnd = null;
                
                this.clearTempMarkers();
                this.updateStatus('Выберите начальную точку (кабинет или точка интереса)');
                this.updateButtons();
                this.updateSelectionDisplay();
            }
            
            handleMapClick(latlng) {
                if (!this.mode || !this.isMobile) return;
                
                const nearest = this.findNearestPoint(latlng);
                
                if (!nearest) {
                    this.mapViewer.showNotification('Нажмите ближе к кабинету или точке интереса', 'warning');
                    return;
                }
                
                if (this.mode === 'select-start') {
                    this.selectStartPoint(nearest);
                } else if (this.mode === 'select-end') {
                    this.selectEndPoint(nearest);
                }
            }
            
            findNearestPoint(latlng) {
                const maxDistance = 100;
                let nearest = null;
                let minDistance = Infinity;
                
                this.mapViewer.rooms.forEach(room => {
                    if (!room.vertices || room.vertices.length < 3) return;
                    
                    let sumY = 0, sumX = 0;
                    room.vertices.forEach(v => {
                        sumY += v[0];
                        sumX += v[1];
                    });
                    const center = [sumY / room.vertices.length, sumX / room.vertices.length];
                    
                    const distance = Math.sqrt(
                        Math.pow(center[0] - latlng.lat, 2) + 
                        Math.pow(center[1] - latlng.lng, 2)
                    );
                    
                    if (distance < minDistance && distance < maxDistance) {
                        const entrancePoint = this.mapViewer.points.find(p => 
                            p.roomId === room.id && p.type === 'entrance'
                        );
                        
                        if (entrancePoint) {
                            minDistance = distance;
                            nearest = {
                                id: entrancePoint.id,
                                name: room.name,
                                roomId: room.id,
                                type: 'entrance',
                                displayName: room.name
                            };
                        }
                    }
                });
                
                this.mapViewer.points.forEach(point => {
                    if (point.type !== 'point_of_interest') return;
                    
                    const distance = Math.sqrt(
                        Math.pow(point.y - latlng.lat, 2) + 
                        Math.pow(point.x - latlng.lng, 2)
                    );
                    
                    if (distance < minDistance && distance < maxDistance) {
                        minDistance = distance;
                        nearest = {
                            id: point.id,
                            name: point.name,
                            roomId: point.roomId,
                            type: 'point_of_interest',
                            displayName: '📍 ' + point.name
                        };
                    }
                });
                
                return nearest;
            }
            
            selectStartPoint(point) {
                this.selectedStart = point;
                this.mode = 'select-end';
                
                this.addTempMarker(point, 'start');
                this.updateStatus('Выберите конечную точку (кабинет или точка интереса)');
                this.updateSelectionDisplay();
                this.updateButtons();
                
                this.mapViewer.showNotification('Начальная точка: ' + (point.displayName || point.name), 'success');
            }
            
            selectEndPoint(point) {
                if (this.selectedStart && this.selectedStart.id === point.id) {
                    this.mapViewer.showNotification('Выбрана та же точка. Выберите другую.', 'warning');
                    return;
                }
                
                this.selectedEnd = point;
                this.mode = null;
                
                this.addTempMarker(point, 'end');
                this.updateStatus('Обе точки выбраны. Строим маршрут...');
                this.updateSelectionDisplay();
                this.updateButtons();
                
                setTimeout(() => {
                    this.mapViewer.setRoutePoint(this.selectedStart.id, 'start');
                    this.mapViewer.setRoutePoint(this.selectedEnd.id, 'end');
                    this.mapViewer.findRoute();
                    this.hidePanel();
                }, 500);
            }
            
            addTempMarker(point, type) {
                try {
                    const pointData = this.mapViewer.points.find(p => p.id === point.id);
                    if (!pointData) return;
                    
                    const icon = L.divIcon({
                        className: 'temp-marker temp-marker-' + type,
                        html: type === 'start' ? '<i class="fas fa-play"></i>' : '<i class="fas fa-flag-checkered"></i>',
                        iconSize: [36, 36],
                        iconAnchor: [18, 18]
                    });
                    
                    const marker = L.marker([pointData.y, pointData.x], {
                        icon: icon,
                        interactive: false,
                        zIndexOffset: 1000
                    }).addTo(this.mapViewer.map);
                    
                    this.tempMarkers.push(marker);
                } catch (error) {
                    console.error('Ошибка при добавлении маркера:', error);
                }
            }
            
            clearTempMarkers() {
                this.tempMarkers.forEach(marker => {
                    if (marker && this.mapViewer.map.hasLayer(marker)) {
                        this.mapViewer.map.removeLayer(marker);
                    }
                });
                this.tempMarkers = [];
            }
            
            findRoute() {
                if (!this.selectedStart || !this.selectedEnd) return;
                
                this.mapViewer.setRoutePoint(this.selectedStart.id, 'start');
                this.mapViewer.setRoutePoint(this.selectedEnd.id, 'end');
                this.mapViewer.findRoute();
                
                setTimeout(() => this.hidePanel(), 800);
            }
            
            clearSelection() {
                this.mode = null;
                this.selectedStart = null;
                this.selectedEnd = null;
                
                this.clearTempMarkers();
                this.updateStatus('Готово. Нажмите "Начать выбор" для построения маршрута.');
                this.updateSelectionDisplay();
                this.updateButtons();
            }
            
            updateStatus(message) {
                const statusElement = document.getElementById('mobile-routing-status');
                if (statusElement) statusElement.textContent = message;
            }
            
            updateSelectionDisplay() {
                const startValue = document.getElementById('mobile-start-value');
                const endValue = document.getElementById('mobile-end-value');
                
                if (startValue) {
                    startValue.textContent = this.selectedStart ? 
                        (this.selectedStart.displayName || this.selectedStart.name) : 'не выбрано';
                }
                
                if (endValue) {
                    endValue.textContent = this.selectedEnd ? 
                        (this.selectedEnd.displayName || this.selectedEnd.name) : 'не выбрано';
                }
            }
            
            updateButtons() {
                const startBtn = document.getElementById('mobile-start-btn');
                const clearBtn = document.getElementById('mobile-clear-btn');
                const findBtn = document.getElementById('mobile-find-btn');
                
                if (!startBtn || !clearBtn || !findBtn) return;
                
                startBtn.disabled = this.mode !== null;
                clearBtn.disabled = !this.selectedStart && !this.selectedEnd;
                findBtn.disabled = !this.selectedStart || !this.selectedEnd;
                
                if (this.mode === 'select-start') {
                    startBtn.innerHTML = '<i class="fas fa-dot-circle"></i> Выбор начальной';
                } else if (this.mode === 'select-end') {
                    startBtn.innerHTML = '<i class="fas fa-dot-circle"></i> Выбор конечной';
                } else {
                    startBtn.innerHTML = '<i class="fas fa-play"></i> Начать выбор';
                }
            }
        }

        const style = document.createElement('style');
        style.textContent = \`
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            
            .leaflet-control-zoom {
                margin-top: 80px !important;
            }
            
            .btn-small {
                padding: 4px 8px;
                font-size: 11px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                color: white;
            }
            
            .btn-small.btn-success {
                background: #28a745;
            }
            
            .btn-small.btn-success:hover {
                background: #218838;
            }
            
            .btn-small.btn-danger {
                background: #dc3545;
            }
            
            .btn-small.btn-danger:hover {
                background: #c82333;
            }
            
            .temp-marker {
                z-index: 1000 !important;
                animation: pulse 1.5s infinite;
            }
        \`;
        document.head.appendChild(style);

        document.addEventListener('DOMContentLoaded', function() {
            try {
                window.mapViewer = new OfficeMapViewer();
            } catch (error) {
                console.error('Ошибка создания OfficeMapViewer:', error);
                alert('Ошибка загрузки карты: ' + error.message);
            }
        });
    </script>
</body>
</html>`;
    }

    createGraphData(points, connections) {
        const graph = {};
        
        points.forEach(point => {
            if (point.isRouting !== false) {
                graph[point.id] = [];
            }
        });
        
        connections.forEach(conn => {
            if (graph[conn.from] && graph[conn.to]) {
                graph[conn.from].push({
                    node: conn.to,
                    length: conn.length,
                    connection: conn
                });
                
                if (conn.isBidirectional) {
                    graph[conn.to].push({
                        node: conn.from,
                        length: conn.length,
                        connection: conn
                    });
                }
            }
        });
        
        return graph;
    }

    escapeHtml(text) {
        if (text === undefined || text === null) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

window.WebExporter = WebExporter;
