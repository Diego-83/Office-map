/**
 * Mobile Exporter - создание мобильной версии интерактивной карты
 * Максимально упрощенный интерфейс
 */

class MobileExporter {
    constructor(dataManager) {
        this.dataManager = dataManager;
        console.log('MobileExporter инициализирован');
    }

    /**
     * Экспорт мобильной версии
     * @param {object} options - Настройки экспорта
     * @returns {boolean} Успешно ли экспортировано
     */
    exportMobileInterface(options = {}) {
        try {
            const htmlContent = this.generateMobileHTML(options);
            const filename = options.filename || 'mobile_office_map.html';
            
            Utils.downloadFile(htmlContent, filename, 'text/html');
            
            return true;
        } catch (error) {
            console.error('Ошибка экспорта мобильной версии:', error);
            return false;
        }
    }

    /**
     * Генерация HTML для мобильной версии
     * @param {object} options - Настройки
     * @returns {string} HTML содержимое
     */
    generateMobileHTML(options = {}) {
        const data = options.data || this.dataManager.getData();
        const title = options.title || 'Карта офиса';
        const description = options.description || 'Навигация по офису';
        
        // Фильтруем данные для мобильной версии
        const mobileData = this.prepareMobileData(data);
        
        // HTML структура
        return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>${Utils.escapeHtml(title)}</title>
    
    <!-- Leaflet CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Стили -->
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
        }

        html, body {
            height: 100%;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #f5f5f5;
            touch-action: manipulation;
        }

        body {
            position: fixed;
            width: 100%;
            height: 100%;
        }

        /* Карта на весь экран */
        #map {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #ddd;
            z-index: 1;
        }

        /* Кнопка сброса маршрута */
        #clear-route-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            background: #e74c3c;
            color: white;
            border: none;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            font-size: 24px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            cursor: pointer;
            display: none; /* Скрыта по умолчанию */
            align-items: center;
            justify-content: center;
        }

        #clear-route-btn.active {
            display: flex;
        }

        /* Инструкция */
        #instruction {
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 12px;
            z-index: 1000;
            font-size: 14px;
            text-align: center;
            backdrop-filter: blur(10px);
        }

        /* Маркеры для точек интереса */
        .interest-marker {
            width: 24px !important;
            height: 24px !important;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #3498db;
            color: white;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            font-size: 12px !important;
        }

        /* Маркеры для точек входа */
        .entrance-marker {
            width: 20px !important;
            height: 20px !important;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #2ecc71;
            color: white;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            font-size: 10px !important;
        }

        /* Временные маркеры (выбор точек) */
        .temp-marker {
            width: 40px !important;
            height: 40px !important;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 18px !important;
            box-shadow: 0 3px 15px rgba(0,0,0,0.4);
            border: 3px solid white;
            z-index: 1000 !important;
        }

        .marker-start {
            background: #28a745;
        }

        .marker-end {
            background: #dc3545;
        }

        /* Линия маршрута */
        .route-line {
            stroke-width: 8;
            stroke: #27ae60;
            stroke-opacity: 0.9;
            stroke-dasharray: 15, 15;
            fill: none;
            z-index: 500 !important;
        }

        /* Подписи кабинетов */
        .room-label {
            pointer-events: none !important;
            z-index: 10 !important;
        }

        .room-label-content {
            background-color: rgba(255, 255, 255, 0.95) !important;
            padding: 4px 10px !important;
            border-radius: 4px !important;
            border: 2px solid #3498db !important;
            color: #333 !important;
            font-weight: bold !important;
            font-size: 12px !important;
            text-align: center !important;
            white-space: nowrap !important;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            max-width: 200px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
        }

        /* Уведомления */
        .notification {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #28a745;
            color: white;
            padding: 15px 25px;
            border-radius: 12px;
            z-index: 3000;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            font-weight: 500;
            text-align: center;
            max-width: 90%;
            animation: slideDown 0.3s ease;
        }

        .notification.warning {
            background: #f39c12;
        }

        .notification.error {
            background: #e74c3c;
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(-30px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }

        /* Адаптация под мобильные */
        @media (max-width: 480px) {
            #instruction {
                font-size: 12px;
                padding: 12px;
                bottom: 15px;
                left: 15px;
                right: 15px;
            }
            
            #clear-route-btn {
                top: 15px;
                right: 15px;
                width: 45px;
                height: 45px;
                font-size: 22px;
            }
            
            .interest-marker {
                width: 22px !important;
                height: 22px !important;
                font-size: 11px !important;
            }
            
            .entrance-marker {
                width: 18px !important;
                height: 18px !important;
                font-size: 9px !important;
            }
            
            .room-label-content {
                font-size: 10px !important;
                padding: 3px 8px !important;
            }
        }

        /* Безопасные зоны iPhone */
        @supports (padding: max(0px)) {
            body {
                padding-top: env(safe-area-inset-top);
                padding-bottom: env(safe-area-inset-bottom);
                padding-left: env(safe-area-inset-left);
                padding-right: env(safe-area-inset-right);
            }

            #instruction {
                bottom: max(20px, env(safe-area-inset-bottom));
            }
            
            #clear-route-btn {
                top: max(20px, env(safe-area-inset-top));
            }
        }
    </style>
</head>
<body>
    <!-- Карта -->
    <div id="map"></div>

    <!-- Кнопка сброса маршрута -->
    <button id="clear-route-btn">
        <i class="fas fa-times"></i>
    </button>

    <!-- Инструкция -->
    <div id="instruction">
        <i class="fas fa-hand-pointer"></i> Нажмите на точку интереса для выбора начала маршрута
    </div>

    <!-- Leaflet JS -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    
    <!-- Основной скрипт -->
    <script>
        // Данные карты
        const mapData = ${JSON.stringify(mobileData)};
        
        console.log('Мобильная версия загружена:', {
            rooms: mapData.rooms.length,
            points: mapData.points.length,
            connections: mapData.connections.length
        });

        // Основной класс мобильной карты
        class MobileOfficeMap {
            constructor() {
                this.map = null;
                this.rooms = mapData.rooms || [];
                this.points = mapData.points || [];
                this.connections = mapData.connections || [];
                
                // Исправляем структуру координат для точек
                this.points = this.points.map(point => {
                    // Если координаты в неправильном формате, исправляем
                    if (point && (point.latlng || point.x !== undefined || point.y !== undefined)) {
                        const newPoint = { ...point };
                        
                        // Проверяем формат координат
                        if (point.latlng && Array.isArray(point.latlng)) {
                            // Формат: latlng: [y, x]
                            newPoint.y = point.latlng[0];
                            newPoint.x = point.latlng[1];
                        } else if (point.coordinates && Array.isArray(point.coordinates)) {
                            // Формат: coordinates: [x, y]
                            newPoint.x = point.coordinates[0];
                            newPoint.y = point.coordinates[1];
                        }
                        
                        // Обеспечиваем наличие координат
                        if (newPoint.x === undefined && newPoint.y === undefined) {
                            newPoint.x = 0;
                            newPoint.y = 0;
                        }
                        
                        return newPoint;
                    }
                    return point;
                }).filter(point => point !== null && point !== undefined);
                
                console.log('Точки после обработки:', this.points.length);
                
                // Состояние маршрутизации
                this.routingMode = 'select-start'; // 'select-start', 'select-end'
                this.selectedStart = null;
                this.selectedEnd = null;
                this.tempMarkers = [];
                this.currentRoute = null;
                
                // Визуальные элементы
                this.roomLayers = {};
                this.roomLabels = {};
                this.pointMarkers = {};
                
                // Создаем граф для поиска пути
                this.graph = this.buildGraph();
                console.log('Граф создан:', Object.keys(this.graph).length, 'вершин');
                
                this.init();
            }
            
            /**
             * Построение графа соединений
             */
            buildGraph() {
                const graph = {};
                
                // Инициализируем узлы
                this.points.forEach(point => {
                    if (point.id) {
                        graph[point.id] = [];
                    }
                });
                
                // Добавляем соединения
                this.connections.forEach(conn => {
                    if (graph[conn.from] && graph[conn.to]) {
                        // Добавляем в обе стороны для двусторонних соединений
                        graph[conn.from].push({
                            node: conn.to,
                            distance: this.calculateDistance(conn.from, conn.to)
                        });
                        
                        graph[conn.to].push({
                            node: conn.from,
                            distance: this.calculateDistance(conn.to, conn.from)
                        });
                    }
                });
                
                return graph;
            }
            
            /**
             * Расчет расстояния между точками
             */
            calculateDistance(fromId, toId) {
                const fromPoint = this.points.find(p => p.id === fromId);
                const toPoint = this.points.find(p => p.id === toId);
                
                if (!fromPoint || !toPoint) return Infinity;
                
                return Math.sqrt(
                    Math.pow(fromPoint.x - toPoint.x, 2) + 
                    Math.pow(fromPoint.y - toPoint.y, 2)
                );
            }
            
            /**
             * Поиск кратчайшего пути
             */
            findShortestPath(startId, endId) {
                console.log('Поиск пути от', startId, 'до', endId);
                
                if (!this.graph[startId] || !this.graph[endId]) {
                    console.log('Точки не в графе');
                    return null;
                }
                
                if (startId === endId) {
                    console.log('Точки совпадают');
                    return [startId];
                }
                
                // BFS поиск
                const queue = [{ node: startId, path: [startId] }];
                const visited = new Set([startId]);
                
                while (queue.length > 0) {
                    const current = queue.shift();
                    
                    if (current.node === endId) {
                        console.log('Путь найден:', current.path);
                        return current.path;
                    }
                    
                    const neighbors = this.graph[current.node] || [];
                    
                    for (const neighbor of neighbors) {
                        if (!visited.has(neighbor.node)) {
                            visited.add(neighbor.node);
                            queue.push({
                                node: neighbor.node,
                                path: [...current.path, neighbor.node]
                            });
                        }
                    }
                }
                
                console.log('Путь не найден');
                return null;
            }
            
            /**
             * Инициализация
             */
            init() {
                console.log('Инициализация мобильной карты...');
                
                this.initMap();
                this.loadMapData();
                this.setupEventListeners();
                
                console.log('Мобильная карта инициализирована');
                this.showNotification('Карта готова. Нажмите на точку для начала маршрута.', 'success');
            }
            
            /**
             * Инициализация карты
             */
            initMap() {
                try {
                    // Создаем карту
                    this.map = L.map('map', {
                        zoomControl: true,
                        zoomControlOptions: {
                            position: 'topleft'
                        },
                        attributionControl: false
                    }).setView([540, 960], -1);
                    
                    // Настройка координатной системы
                    this.map.options.crs = L.CRS.Simple;
                    
                    // Устанавливаем границы
                    const bounds = [[0, 0], [1080, 1920]];
                    this.map.setMaxBounds(bounds);
                    this.map.fitBounds(bounds);
                    
                    // Пробуем загрузить изображение плана
                    this.loadMapImage();
                    
                    // Добавляем обработчик клика
                    this.map.on('click', (e) => {
                        this.handleMapClick(e);
                    });
                    
                } catch (error) {
                    console.error('Ошибка инициализации карты:', error);
                }
            }
            
            /**
             * Загрузка изображения плана
             */
            loadMapImage() {
                const testImage = new Image();
                testImage.onload = () => {
                    console.log(\`Изображение плана загружено: \${testImage.width}x\${testImage.height}\`);
                    
                    const imageBounds = [[0, 0], [testImage.height, testImage.width]];
                    L.imageOverlay('plan.png', imageBounds).addTo(this.map);
                    
                    this.map.setMaxBounds(imageBounds);
                    this.map.fitBounds(imageBounds);
                };
                
                testImage.onerror = () => {
                    console.warn('Изображение plan.png не найдено. Создаем тестовую подложку.');
                    this.createTestBackground();
                };
                
                testImage.src = 'plan.png';
            }
            
            /**
             * Создание тестовой подложки
             */
            createTestBackground() {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = 1920;
                    canvas.height = 1080;
                    const ctx = canvas.getContext('2d');
                    
                    // Заполняем фон
                    ctx.fillStyle = '#f0f0f0';
                    ctx.fillRect(0, 0, 1920, 1080);
                    
                    // Сетка
                    ctx.strokeStyle = '#d0d0d0';
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
                        ctx.lineTo(1920, y);
                        ctx.stroke();
                    }
                    
                    // Текст
                    ctx.fillStyle = '#3498db';
                    ctx.font = 'bold 48px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('КАРТА ОФИСА', 960, 200);
                    
                    ctx.fillStyle = '#666';
                    ctx.font = '24px Arial';
                    ctx.fillText('Мобильная версия', 960, 250);
                    
                    const dataURL = canvas.toDataURL('image/png');
                    L.imageOverlay(dataURL, [[0, 0], [1080, 1920]]).addTo(this.map);
                    
                } catch (error) {
                    console.error('Ошибка создания тестовой подложки:', error);
                }
            }
            
            /**
             * Загрузка данных на карту
             */
            loadMapData() {
                console.log('Загрузка данных на карту...');
                
                // Загружаем кабинеты
                this.rooms.forEach((room) => {
                    this.addRoomToMap(room);
                });
                
                // Загружаем только точки интереса и входа
                this.points.forEach((point) => {
                    if (point.type === 'point_of_interest' || point.type === 'entrance') {
                        this.addPointToMap(point);
                    }
                });
                
                console.log('Данные загружены:', {
                    комнат: Object.keys(this.roomLayers).length,
                    точек: Object.keys(this.pointMarkers).length
                });
            }
            
            /**
             * Добавление кабинета на карту
             */
            addRoomToMap(room) {
                if (!room.vertices || room.vertices.length < 3) {
                    return;
                }
                
                // Преобразуем координаты
                const vertices = room.vertices.map(vertex => {
                    if (Array.isArray(vertex) && vertex.length >= 2) {
                        return [vertex[0], vertex[1]];
                    } else if (vertex && typeof vertex === 'object') {
                        return [vertex.y || vertex.lat || 0, vertex.x || vertex.lng || 0];
                    }
                    return [0, 0];
                });
                
                // Создаем полигон
                const polygon = L.polygon(vertices, {
                    color: room.color || '#3498db',
                    fillColor: room.color || '#3498db',
                    fillOpacity: 0.2,
                    weight: 1
                }).addTo(this.map);
                
                this.roomLayers[room.id] = polygon;
                
                // Добавляем подпись в центр
                this.addRoomLabel(room, vertices);
            }
            
            /**
             * Добавление подписи кабинета (в центр полигона)
             */
            addRoomLabel(room, vertices) {
                // Рассчитываем геометрический центр
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                
                vertices.forEach(vertex => {
                    const y = vertex[0];
                    const x = vertex[1];
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                });
                
                const centerX = (minX + maxX) / 2;
                const centerY = (minY + maxY) / 2;
                
                // Создаем подпись
                const label = L.marker([centerY, centerX], {
                    icon: L.divIcon({
                        className: 'room-label',
                        html: \`<div class="room-label-content">\${this.escapeHtml(room.name)}</div>\`,
                        iconSize: null,
                        iconAnchor: [0, 0]
                    }),
                    interactive: false
                }).addTo(this.map);
                
                this.roomLabels[room.id] = label;
            }
            
            /**
             * Добавление точки на карту
             */
            addPointToMap(point) {
                if (!point) return;
                
                const x = point.x || 0;
                const y = point.y || 0;
                
                // Определяем класс и иконку в зависимости от типа
                let markerClass = '';
                let iconChar = 'fa-map-marker-alt';
                
                if (point.type === 'entrance') {
                    markerClass = 'entrance-marker';
                    iconChar = 'fa-door-open';
                } else {
                    markerClass = 'interest-marker';
                    iconChar = 'fa-map-marker-alt';
                }
                
                const icon = L.divIcon({
                    className: \`mobile-marker \${markerClass}\`,
                    html: \`<div style="width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="fas \${iconChar}"></i>
                    </div>\`,
                    iconSize: point.type === 'entrance' ? [20, 20] : [24, 24],
                    iconAnchor: point.type === 'entrance' ? [10, 10] : [12, 12]
                });
                
                const marker = L.marker([y, x], {
                    icon: icon,
                    pointId: point.id
                }).addTo(this.map);
                
                // Обработчик клика на точке
                marker.on('click', () => {
                    this.selectPoint(point);
                });
                
                this.pointMarkers[point.id] = marker;
            }
            
            /**
             * Обработчик клика на карте
             */
            handleMapClick(e) {
                // Находим ближайшую точку
                const nearestPoint = this.findNearestPoint(e.latlng);
                
                if (nearestPoint) {
                    this.selectPoint(nearestPoint);
                }
            }
            
            /**
             * Поиск ближайшей точки
             */
            findNearestPoint(latlng) {
                let nearestPoint = null;
                let minDistance = Infinity;
                const maxDistance = 50;
                
                // Ищем среди видимых точек
                this.points.forEach(point => {
                    if (!point.x || !point.y) return;
                    if (point.type !== 'point_of_interest' && point.type !== 'entrance') return;
                    
                    const pointLatLng = L.latLng(point.y, point.x);
                    const distance = this.map.distance(latlng, pointLatLng);
                    
                    if (distance < minDistance && distance < maxDistance) {
                        minDistance = distance;
                        nearestPoint = point;
                    }
                });
                
                return nearestPoint;
            }
            
            /**
             * Выбор точки
             */
            selectPoint(point) {
                if (this.routingMode === 'select-start') {
                    // Выбор начальной точки
                    this.selectedStart = point;
                    this.addTempMarker([point.y, point.x], 'start');
                    this.showNotification(\`Начальная точка: "\${point.name}"\`, 'success');
                    this.updateInstruction('Выберите конечную точку');
                    this.routingMode = 'select-end';
                    
                } else if (this.routingMode === 'select-end') {
                    // Проверяем, не выбрана ли та же точка
                    if (this.selectedStart && this.selectedStart.id === point.id) {
                        this.showNotification('Вы выбрали ту же точку. Выберите другую.', 'warning');
                        return;
                    }
                    
                    // Выбор конечной точки
                    this.selectedEnd = point;
                    this.addTempMarker([point.y, point.x], 'end');
                    this.showNotification(\`Конечная точка: "\${point.name}"\`, 'success');
                    this.updateInstruction('Построение маршрута...');
                    
                    // Автоматически строим маршрут
                    setTimeout(() => {
                        this.findRoute();
                    }, 500);
                }
            }
            
            /**
             * Добавление временного маркера
             */
            addTempMarker(latlng, type) {
                try {
                    const icon = L.divIcon({
                        className: \`mobile-marker temp-marker marker-\${type}\`,
                        html: \`<div>
                            <i class="fas \${type === 'start' ? 'fa-play' : 'fa-stop'}"></i>
                        </div>\`,
                        iconSize: [40, 40],
                        iconAnchor: [20, 20]
                    });
                    
                    const marker = L.marker(latlng, {
                        icon: icon,
                        interactive: false,
                        zIndexOffset: 1000
                    }).addTo(this.map);
                    
                    this.tempMarkers.push(marker);
                    
                } catch (error) {
                    console.error('Ошибка при добавлении маркера:', error);
                }
            }
            
            /**
             * Поиск маршрута
             */
            findRoute() {
                if (!this.selectedStart || !this.selectedEnd) return;
                
                console.log('Поиск маршрута:', this.selectedStart.name, '->', this.selectedEnd.name);
                
                // Очищаем предыдущий маршрут
                if (this.currentRoute) {
                    this.map.removeLayer(this.currentRoute);
                    this.currentRoute = null;
                }
                
                // Ищем путь через граф
                const path = this.findShortestPath(this.selectedStart.id, this.selectedEnd.id);
                
                if (!path || path.length < 2) {
                    // Путь не найден, строим прямую линию
                    this.buildDirectRoute();
                    return;
                }
                
                // Строим маршрут через найденный путь
                this.buildRouteFromPath(path);
            }
            
            /**
             * Построение прямого маршрута
             */
            buildDirectRoute() {
                try {
                    this.currentRoute = L.polyline([
                        [this.selectedStart.y, this.selectedStart.x],
                        [this.selectedEnd.y, this.selectedEnd.x]
                    ], {
                        color: '#27ae60',
                        weight: 8,
                        opacity: 0.9,
                        dashArray: '15, 15',
                        zIndexOffset: 500
                    }).addTo(this.map);
                    
                    // Фокусируем карту на маршруте
                    const bounds = this.currentRoute.getBounds();
                    this.map.fitBounds(bounds);
                    
                    // Показываем кнопку сброса
                    document.getElementById('clear-route-btn').classList.add('active');
                    this.updateInstruction('Маршрут построен. Нажмите ✕ для сброса.');
                    
                    this.showNotification('Маршрут построен!', 'success');
                    
                } catch (error) {
                    console.error('Ошибка построения маршрута:', error);
                    this.showNotification('Ошибка построения маршрута', 'error');
                }
            }
            
            /**
             * Построение маршрута из пути
             */
            buildRouteFromPath(path) {
                try {
                    // Собираем координаты
                    const coordinates = [];
                    path.forEach(pointId => {
                        const point = this.points.find(p => p.id === pointId);
                        if (point) {
                            coordinates.push([point.y, point.x]);
                        }
                    });
                    
                    if (coordinates.length < 2) {
                        this.buildDirectRoute();
                        return;
                    }
                    
                    // Создаем линию маршрута
                    this.currentRoute = L.polyline(coordinates, {
                        color: '#27ae60',
                        weight: 8,
                        opacity: 0.9,
                        dashArray: '15, 15',
                        zIndexOffset: 500
                    }).addTo(this.map);
                    
                    // Фокусируем карту на маршруте
                    const bounds = this.currentRoute.getBounds();
                    this.map.fitBounds(bounds);
                    
                    // Показываем кнопку сброса
                    document.getElementById('clear-route-btn').classList.add('active');
                    this.updateInstruction('Маршрут построен. Нажмите ✕ для сброса.');
                    
                    this.showNotification(\`Маршрут найден через \${path.length} точек!\`, 'success');
                    
                } catch (error) {
                    console.error('Ошибка построения маршрута:', error);
                    this.buildDirectRoute();
                }
            }
            
            /**
             * Очистка маршрута
             */
            clearRoute() {
                console.log('Очистка маршрута');
                
                // Сбрасываем состояние
                this.routingMode = 'select-start';
                this.selectedStart = null;
                this.selectedEnd = null;
                
                // Очищаем временные маркеры
                this.tempMarkers.forEach(marker => {
                    if (marker && this.map.hasLayer(marker)) {
                        this.map.removeLayer(marker);
                    }
                });
                this.tempMarkers = [];
                
                // Очищаем маршрут
                if (this.currentRoute) {
                    this.map.removeLayer(this.currentRoute);
                    this.currentRoute = null;
                }
                
                // Скрываем кнопку сброса
                document.getElementById('clear-route-btn').classList.remove('active');
                
                // Обновляем инструкцию
                this.updateInstruction('Нажмите на точку для выбора начала маршрута');
                
                this.showNotification('Маршрут сброшен', 'warning');
            }
            
            /**
             * Обновление инструкции
             */
            updateInstruction(text) {
                const instruction = document.getElementById('instruction');
                if (instruction) {
                    instruction.innerHTML = \`<i class="fas fa-hand-pointer"></i> \${text}\`;
                }
            }
            
            /**
             * Настройка обработчиков событий
             */
            setupEventListeners() {
                // Кнопка сброса маршрута
                const clearBtn = document.getElementById('clear-route-btn');
                if (clearBtn) {
                    clearBtn.addEventListener('click', () => {
                        this.clearRoute();
                    });
                }
            }
            
            /**
             * Показать уведомление
             */
            showNotification(message, type = 'info') {
                const colors = {
                    info: '#3498db',
                    success: '#28a745',
                    warning: '#f39c12',
                    error: '#e74c3c'
                };
                
                try {
                    const notification = document.createElement('div');
                    notification.className = \`notification \${type}\`;
                    notification.textContent = message;
                    
                    document.body.appendChild(notification);
                    
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.style.opacity = '0';
                            notification.style.transition = 'opacity 0.3s ease';
                            setTimeout(() => {
                                if (notification.parentNode) {
                                    notification.parentNode.removeChild(notification);
                                }
                            }, 300);
                        }
                    }, 3000);
                } catch (error) {
                    console.error('Ошибка показа уведомления:', error);
                }
            }
            
            /**
             * Экранирование HTML
             */
            escapeHtml(text) {
                if (!text) return '';
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }
        }

        // Инициализация при загрузке
        document.addEventListener('DOMContentLoaded', function() {
            try {
                window.mobileMap = new MobileOfficeMap();
                console.log('MobileOfficeMap успешно создан');
            } catch (error) {
                console.error('Ошибка создания MobileOfficeMap:', error);
            }
        });
    </script>
</body>
</html>`;
    }

    /**
     * Подготовка данных для мобильной версии
     */
    prepareMobileData(data) {
        console.log('Подготовка данных для мобильной версии...', data);
        
        // Преобразуем данные для мобильной версии
        const mobileData = {
            rooms: (data.rooms || []).map(room => {
                // Копируем комнату
                const mobileRoom = { ...room };
                
                // Убедимся, что есть id
                if (!mobileRoom.id && mobileRoom.name) {
                    mobileRoom.id = 'room_' + mobileRoom.name.replace(/\s+/g, '_').toLowerCase();
                }
                
                // Преобразуем вершины, если нужно
                if (mobileRoom.vertices && Array.isArray(mobileRoom.vertices)) {
                    mobileRoom.vertices = mobileRoom.vertices.map(vertex => {
                        if (Array.isArray(vertex) && vertex.length >= 2) {
                            return [vertex[0], vertex[1]];
                        } else if (vertex && typeof vertex === 'object') {
                            return [
                                vertex.y || vertex.lat || 0,
                                vertex.x || vertex.lng || 0
                            ];
                        }
                        return [0, 0];
                    });
                }
                
                return mobileRoom;
            }),
            
            points: (data.points || []).map(point => {
                // Копируем точку
                const mobilePoint = { ...point };
                
                // Убедимся, что есть id
                if (!mobilePoint.id) {
                    mobilePoint.id = 'point_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                }
                
                // Преобразуем координаты
                if (mobilePoint.latlng && Array.isArray(mobilePoint.latlng)) {
                    mobilePoint.y = mobilePoint.latlng[0];
                    mobilePoint.x = mobilePoint.latlng[1];
                } else if (mobilePoint.coordinates && Array.isArray(mobilePoint.coordinates)) {
                    mobilePoint.x = mobilePoint.coordinates[0];
                    mobilePoint.y = mobilePoint.coordinates[1];
                }
                
                return mobilePoint;
            }),
            
            connections: data.connections || []
        };
        
        console.log('Мобильные данные подготовлены:', {
            rooms: mobileData.rooms.length,
            points: mobileData.points.length,
            connections: mobileData.connections.length
        });
        
        return mobileData;
    }
}

// ДОБАВЬТЕ ЭТУ СТРОКУ:
window.MobileExporter = MobileExporter;
