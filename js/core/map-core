/**
 * Ядро карты - управление Leaflet картой и базовыми слоями
 */

class MapCore {
    constructor() {
        this.map = null;
        this.imageOverlay = null;
        this.layers = {
            rooms: {},
            points: {},
            routes: {},
            routePoints: {},
            temp: {}
        };
        this.editMode = null;
        this.imageBounds = null;
        this.coordsDisplay = null;
        this.initPromise = null;
    }

    /**
     * Инициализация карты
     * @param {string} mapContainerId - ID контейнера карты
     * @param {string} imagePath - Путь к изображению плана
     * @returns {Promise<boolean>} Promise с результатом инициализации
     */
    init(mapContainerId, imagePath) {
        return new Promise((resolve, reject) => {
            try {
                console.log('Инициализация карты...');
                
                // Создаем карту
                this.map = L.map(mapContainerId, {
                    crs: L.CRS.Simple,
                    minZoom: -2,
                    maxZoom: 2,
                    zoomControl: false,
                    attributionControl: false
                });

                // Устанавливаем границы для изображения 1920x1080
                // В CRS.Simple: Y идет сверху вниз (0-1080), X слева направо (0-1920)
                this.imageBounds = [[0, 0], [1080, 1920]];
                
                console.log('Установлены границы карты:', this.imageBounds);
                
                // Добавляем изображение плана
                this.imageOverlay = L.imageOverlay(imagePath, this.imageBounds, {
                    opacity: 1
                }).addTo(this.map);

                // Устанавливаем вид на весь план
                this.map.fitBounds(this.imageBounds);

                // Центрируем карту
                this.map.setView([540, 960], 0); // центр 1080/2=540, 1920/2=960

                // Добавляем элементы управления
                L.control.zoom({
                    position: 'topright'
                }).addTo(this.map);

                // Создаем отображение координат
                this.createCoordsDisplay();

                // Настраиваем обработчики событий
                this.setupEventHandlers();

                // Инициализируем слои
                this.initLayers();

                // Обновляем состояние
                this.editMode = null;

                console.log('Карта успешно инициализирована с размерами 1920x1080');
                resolve(true);

            } catch (error) {
                console.error('Ошибка инициализации карты:', error);
                reject(error);
            }
        });
    }

    /**
     * Создание отображения координат
     */
    createCoordsDisplay() {
        this.coordsDisplay = document.getElementById('coords-display');
        if (!this.coordsDisplay) {
            this.coordsDisplay = document.createElement('div');
            this.coordsDisplay.id = 'coords-display';
            this.coordsDisplay.style.cssText = `
                position: absolute;
                bottom: 10px;
                left: 10px;
                background: white;
                padding: 5px 10px;
                border-radius: 4px;
                font-size: 12px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                z-index: 1000;
            `;
            this.map.getContainer().appendChild(this.coordsDisplay);
        }
    }

    /**
     * Настройка обработчиков событий карты
     */
    setupEventHandlers() {
        // Обновление координат при движении мыши
        this.map.on('mousemove', (e) => {
            this.updateCoordsDisplay(e.latlng);
        });

        // Клик вне режима редактирования
        this.map.on('click', (e) => {
            if (!this.editMode) {
                // Можно добавить логику для обычного клика
            }
        });

        // Обработка контекстного меню (правый клик)
        this.map.on('contextmenu', (e) => {
            e.originalEvent.preventDefault();
            // Можно добавить контекстное меню
        });
    }

    /**
     * Обновление отображения координат
     * @param {L.LatLng} latlng - Координаты
     */
    updateCoordsDisplay(latlng) {
        if (this.coordsDisplay) {
            const y = Math.round(latlng.lat);
            const x = Math.round(latlng.lng);
            this.coordsDisplay.textContent = `Координаты: y=${y}, x=${x}`;
            this.coordsDisplay.title = `Точные координаты: y=${latlng.lat.toFixed(2)}, x=${latlng.lng.toFixed(2)}`;
        }
    }

    /**
     * Инициализация групп слоев
     */
    initLayers() {
        // Основные группы слоев
        this.layerGroups = {
            rooms: L.layerGroup().addTo(this.map),
            points: L.layerGroup().addTo(this.map),
            routes: L.layerGroup().addTo(this.map),
            routePoints: L.layerGroup().addTo(this.map),
            temp: L.layerGroup().addTo(this.map)
        };
    }

    /**
     * Установка режима редактирования
     * @param {string} mode - Режим (polygon, point, route и т.д.)
     */
    setEditMode(mode) {
        console.log('Установка режима редактирования:', mode);
        const oldMode = this.editMode;
        this.editMode = mode;

        // Меняем курсор в зависимости от режима
        const container = this.map.getContainer();
        switch (mode) {
            case 'polygon':
                container.style.cursor = 'crosshair';
                break;
            case 'point':
                container.style.cursor = 'crosshair';
                break;
            case 'route':
                container.style.cursor = 'crosshair';
                break;
            case 'route-point-placement':
                container.style.cursor = 'crosshair';
                break;
            default:
                container.style.cursor = '';
                break;
        }

        // Сбрасываем временные слои при смене режима
        if (oldMode !== mode) {
            this.clearTempLayers();
        }

        return this.editMode;
    }

    /**
     * Получение текущего режима редактирования
     * @returns {string|null} Текущий режим
     */
    getEditMode() {
        return this.editMode;
    }

    /**
     * Сброс режима рисования
     */
    resetDrawingMode() {
        this.setEditMode(null);
        this.clearTempLayers();
    }

    /**
     * Очистка временных слоев
     */
    clearTempLayers() {
        Object.keys(this.layers.temp).forEach(layerId => {
            if (this.layers.temp[layerId]) {
                this.map.removeLayer(this.layers.temp[layerId]);
                delete this.layers.temp[layerId];
            }
        });
    }

    /**
     * Добавление кабинета на карту
     * @param {object} roomData - Данные кабинета
     * @returns {L.Polygon|null} Созданный полигон
     */
    addRoom(roomData) {
        if (!roomData || !roomData.vertices || roomData.vertices.length < 3) {
            console.error('Неверные данные кабинета:', roomData);
            return null;
        }

        try {
            // Создаем полигон
            const polygon = L.polygon(roomData.vertices, {
                color: roomData.color || '#3498db',
                weight: 2,
                fillColor: roomData.color || '#3498db',
                fillOpacity: 0.4,
                className: 'room-polygon'
            });

            // Добавляем на карту
            polygon.addTo(this.layerGroups.rooms);

            // Создаем popup с информацией
            const popupContent = this.createRoomPopup(roomData);
            polygon.bindPopup(popupContent, {
                maxWidth: 300
            });

            // Добавляем обработчик клика
            polygon.on('click', (e) => {
                if (roomData.id) {
                    this.highlightRoom(roomData.id);
                }
            });

            // Сохраняем в слои
            if (roomData.id) {
                this.layers.rooms[roomData.id] = polygon;
            }

            console.log('Кабинет добавлен на карту:', roomData.id);
            return polygon;

        } catch (error) {
            console.error('Ошибка добавления кабинета на карту:', error);
            Utils.showNotification('Ошибка добавления кабинета', 'error');
            return null;
        }
    }

    /**
     * Создание popup для кабинета
     * @param {object} roomData - Данные кабинета
     * @returns {string} HTML содержимое popup
     */
    createRoomPopup(roomData) {
        return `
            <div style="padding: 10px; max-width: 300px;">
                <h4 style="margin: 0 0 10px 0; color: ${roomData.color}">
                    <i class="fas fa-door-closed"></i> ${Utils.escapeHtml(roomData.name)}
                </h4>
                <p><strong>Отдел:</strong> ${Utils.escapeHtml(roomData.department || '-')}</p>
                <p><strong>Сотрудники:</strong> ${Utils.escapeHtml(roomData.employees || '-')}</p>
                <p><strong>Телефон:</strong> ${Utils.escapeHtml(roomData.phone || '-')}</p>
                <p><strong>Вершин:</strong> ${roomData.vertices?.length || 0}</p>
                <p><strong>Площадь:</strong> ${(roomData.area || 0).toFixed(0)} кв.ед.</p>
                <div style="margin-top: 10px; font-size: 12px; color: #666;">
                    <i class="fas fa-mouse-pointer"></i> Клик для выделения
                </div>
            </div>
        `;
    }

    /**
     * Обновление кабинета на карту
     * @param {string} roomId - ID кабинета
     * @param {object} roomData - Новые данные кабинета
     * @returns {L.Polygon|null} Обновленный полигон
     */
    updateRoom(roomId, roomData) {
        // Удаляем старый полигон
        if (this.layers.rooms[roomId]) {
            this.layerGroups.rooms.removeLayer(this.layers.rooms[roomId]);
            delete this.layers.rooms[roomId];
        }

        // Добавляем обновленный
        return this.addRoom({ ...roomData, id: roomId });
    }

    /**
     * Удаление кабинета с карты
     * @param {string} roomId - ID кабинета
     * @returns {boolean} Успешно ли удалено
     */
    removeRoom(roomId) {
        if (this.layers.rooms[roomId]) {
            this.layerGroups.rooms.removeLayer(this.layers.rooms[roomId]);
            delete this.layers.rooms[roomId];
            return true;
        }
        return false;
    }

    /**
     * Подсветка кабинета
     * @param {string} roomId - ID кабинета
     */
    highlightRoom(roomId) {
        // Сбрасываем подсветку всех кабинетов
        Object.values(this.layers.rooms).forEach(polygon => {
            polygon.setStyle({
                weight: 2,
                fillOpacity: 0.4
            });
        });

        // Подсвечиваем выбранный кабинет
        if (this.layers.rooms[roomId]) {
            this.layers.rooms[roomId].setStyle({
                weight: 4,
                fillOpacity: 0.6
            });
            this.layers.rooms[roomId].openPopup();
        }
    }

    /**
     * Добавление точки на карту
     * @param {object} pointData - Данные точки
     * @returns {L.CircleMarker|null} Созданный маркер
     */
    addPoint(pointData) {
        if (!pointData || pointData.y === undefined || pointData.x === undefined) {
            console.error('Неверные данные точки:', pointData);
            return null;
        }

        try {
            // Создаем маркер
            const marker = L.circleMarker([pointData.y, pointData.x], {
                radius: 8,
                color: pointData.color || '#e74c3c',
                fillColor: pointData.color || '#e74c3c',
                fillOpacity: 0.8,
                weight: 2,
                className: 'point-marker'
            });

            // Добавляем на карту
            marker.addTo(this.layerGroups.points);

            // Создаем popup
            const popupContent = this.createPointPopup(pointData);
            marker.bindPopup(popupContent, {
                maxWidth: 300
            });

            // Добавляем обработчик клика
            marker.on('click', (e) => {
                if (pointData.id) {
                    this.highlightPoint(pointData.id);
                }
            });

            // Сохраняем в слои
            if (pointData.id) {
                this.layers.points[pointData.id] = marker;
            }

            console.log('Точка добавлена на карту:', pointData.id);
            return marker;

        } catch (error) {
            console.error('Ошибка добавления точки на карту:', error);
            Utils.showNotification('Ошибка добавления точки', 'error');
            return null;
        }
    }

    /**
     * Создание popup для точки
     * @param {object} pointData - Данные точки
     * @returns {string} HTML содержимое popup
     */
    createPointPopup(pointData) {
        return `
            <div style="padding: 10px; max-width: 300px;">
                <h4 style="margin: 0 0 10px 0; color: ${pointData.color}">
                    <i class="fas fa-map-marker-alt"></i> ${Utils.escapeHtml(pointData.name)}
                </h4>
                <p><strong>Тип:</strong> ${Utils.escapeHtml(pointData.type || '-')}</p>
                <p><strong>Координаты:</strong> y=${pointData.y}, x=${pointData.x}</p>
                <p><strong>Описание:</strong> ${Utils.escapeHtml(pointData.description || '-')}</p>
                <div style="margin-top: 10px; font-size: 12px; color: #666;">
                    <i class="fas fa-mouse-pointer"></i> Клик для выделения
                </div>
            </div>
        `;
    }

    /**
     * Обновление точки на карте
     * @param {string} pointId - ID точки
     * @param {object} pointData - Новые данные точки
     * @returns {L.CircleMarker|null} Обновленный маркер
     */
    updatePoint(pointId, pointData) {
        // Удаляем старый маркер
        if (this.layers.points[pointId]) {
            this.layerGroups.points.removeLayer(this.layers.points[pointId]);
            delete this.layers.points[pointId];
        }

        // Добавляем обновленный
        return this.addPoint({ ...pointData, id: pointId });
    }

    /**
     * Удаление точки с карты
     * @param {string} pointId - ID точки
     * @returns {boolean} Успешно ли удалено
     */
    removePoint(pointId) {
        if (this.layers.points[pointId]) {
            this.layerGroups.points.removeLayer(this.layers.points[pointId]);
            delete this.layers.points[pointId];
            return true;
        }
        return false;
    }

    /**
     * Подсветка точки
     * @param {string} pointId - ID точки
     */
    highlightPoint(pointId) {
        // Сбрасываем подсветку всех точек
        Object.values(this.layers.points).forEach(marker => {
            marker.setStyle({
                radius: 8,
                fillOpacity: 0.8
            });
        });

        // Подсвечиваем выбранную точку
        if (this.layers.points[pointId]) {
            this.layers.points[pointId].setStyle({
                radius: 10,
                fillOpacity: 1
            });
            this.layers.points[pointId].openPopup();
        }
    }

    /**
     * Добавление маршрута на карту
     * @param {object} routeData - Данные маршрута
     * @returns {L.Polyline|null} Созданная линия
     */
    addRoute(routeData) {
        if (!routeData || !routeData.points || routeData.points.length < 2) {
            console.error('Неверные данные маршрута:', routeData);
            return null;
        }

        try {
            // Создаем полилинию
            const polyline = L.polyline(routeData.points, {
                color: routeData.color || '#2ecc71',
                weight: routeData.weight || 3,
                opacity: 0.8,
                className: 'route-line'
            });

            // Добавляем на карту
            polyline.addTo(this.layerGroups.routes);

            // Создаем popup
            const popupContent = this.createRoutePopup(routeData);
            polyline.bindPopup(popupContent, {
                maxWidth: 300
            });

            // Добавляем обработчик клика
            polyline.on('click', (e) => {
                if (routeData.id) {
                    this.highlightRoute(routeData.id);
                }
            });

            // Сохраняем в слои
            if (routeData.id) {
                this.layers.routes[routeData.id] = polyline;
            }

            console.log('Маршрут добавлен на карту:', routeData.id);
            return polyline;

        } catch (error) {
            console.error('Ошибка добавления маршрута на карту:', error);
            Utils.showNotification('Ошибка добавления маршрута', 'error');
            return null;
        }
    }

    /**
     * Создание popup для маршрута
     * @param {object} routeData - Данные маршрута
     * @returns {string} HTML содержимое popup
     */
    createRoutePopup(routeData) {
        const startName = routeData.startName || 'Начало';
        const endName = routeData.endName || 'Конец';
        const pointCount = routeData.points?.length || 0;
        
        return `
            <div style="padding: 10px; max-width: 300px;">
                <h4 style="margin: 0 0 10px 0; color: ${routeData.color}">
                    <i class="fas fa-route"></i> ${Utils.escapeHtml(routeData.name)}
                </h4>
                <p><strong>От:</strong> ${Utils.escapeHtml(startName)}</p>
                <p><strong>До:</strong> ${Utils.escapeHtml(endName)}</p>
                <p><strong>Точек маршрута:</strong> ${pointCount}</p>
                <p><strong>Длина:</strong> ${(routeData.length || 0).toFixed(0)} ед.</p>
                <div style="margin-top: 10px; font-size: 12px; color: #666;">
                    <i class="fas fa-mouse-pointer"></i> Клик для выделения
                </div>
            </div>
        `;
    }

    /**
     * Обновление маршрута на карте
     * @param {string} routeId - ID маршрута
     * @param {object} routeData - Новые данные маршрута
     * @returns {L.Polyline|null} Обновленная линия
     */
    updateRoute(routeId, routeData) {
        // Удаляем старую линию
        if (this.layers.routes[routeId]) {
            this.layerGroups.routes.removeLayer(this.layers.routes[routeId]);
            delete this.layers.routes[routeId];
        }

        // Добавляем обновленный
        return this.addRoute({ ...routeData, id: routeId });
    }

    /**
     * Удаление маршрута с карты
     * @param {string} routeId - ID маршрута
     * @returns {boolean} Успешно ли удалено
     */
    removeRoute(routeId) {
        if (this.layers.routes[routeId]) {
            this.layerGroups.routes.removeLayer(this.layers.routes[routeId]);
            delete this.layers.routes[routeId];
            return true;
        }
        return false;
    }

    /**
     * Подсветка маршрута
     * @param {string} routeId - ID маршрута
     */
    highlightRoute(routeId) {
        // Сбрасываем подсветку всех маршрутов
        Object.values(this.layers.routes).forEach(polyline => {
            polyline.setStyle({
                weight: 3,
                opacity: 0.8
            });
        });

        // Подсвечиваем выбранный маршрут
        if (this.layers.routes[routeId]) {
            this.layers.routes[routeId].setStyle({
                weight: 5,
                opacity: 1
            });
            this.layers.routes[routeId].openPopup();
        }
    }

    /**
     * Добавление временного полигона (для рисования)
     * @param {Array} points - Массив точек [[y, x], ...]
     * @param {object} options - Опции стиля
     * @returns {L.Polygon} Временный полигон
     */
    addTempPolygon(points, options = {}) {
        const defaultOptions = {
            color: '#3498db',
            weight: 2,
            fillColor: '#3498db',
            fillOpacity: 0.3,
            dashArray: '5, 5'
        };

        const polygon = L.polygon(points, { ...defaultOptions, ...options });
        polygon.addTo(this.layerGroups.temp);
        
        const id = 'temp_polygon_' + Date.now();
        this.layers.temp[id] = polygon;
        
        return polygon;
    }

    /**
     * Добавление временного маркера
     * @param {Array} point - Точка [y, x]
     * @param {object} options - Опции стиля
     * @returns {L.CircleMarker} Временный маркер
     */
    addTempMarker(point, options = {}) {
        const defaultOptions = {
            radius: 6,
            color: '#3498db',
            fillColor: '#3498db',
            fillOpacity: 0.8,
            weight: 2
        };

        const marker = L.circleMarker(point, { ...defaultOptions, ...options });
        marker.addTo(this.layerGroups.temp);
        
        const id = 'temp_marker_' + Date.now();
        this.layers.temp[id] = marker;
        
        return marker;
    }

    /**
     * Добавление временной линии (для рисования маршрутов)
     * @param {Array} points - Массив точек [[y, x], ...]
     * @param {object} options - Опции стиля
     * @returns {L.Polyline} Временная линия
     */
    addTempPolyline(points, options = {}) {
        const defaultOptions = {
            color: '#2ecc71',
            weight: 3,
            opacity: 0.6,
            dashArray: '10, 5'
        };

        const polyline = L.polyline(points, { ...defaultOptions, ...options });
        polyline.addTo(this.layerGroups.temp);
        
        const id = 'temp_polyline_' + Date.now();
        this.layers.temp[id] = polyline;
        
        return polyline;
    }

    /**
     * Очистка всех слоев (кроме изображения)
     */
    clearAllLayers() {
        // Очищаем группы слоев
        Object.values(this.layerGroups).forEach(group => {
            group.clearLayers();
        });

        // Очищаем объекты слоев
        this.layers = {
            rooms: {},
            points: {},
            routes: {},
            routePoints: {},
            temp: {}
        };

        console.log('Все слои очищены');
    }

    /**
     * Получение статистики по объектам на карте
     * @returns {object} Статистика
     */
    getStats() {
        return {
            rooms: Object.keys(this.layers.rooms).length,
            points: Object.keys(this.layers.points).length,
            routes: Object.keys(this.layers.routes).length,
            routePoints: Object.keys(this.layers.routePoints).length
        };
    }
}

// Экспортируем класс для глобального использования
window.MapCore = MapCore;
