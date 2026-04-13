/**
 * Ядро карты - управление Leaflet картой и базовыми слоями
 */

class MapCore {
    constructor() {
        this.map = null;
        this.imageOverlay = null;
        this.layers = {
            rooms: {},     // Объекты комнат {polygon: L.Polygon, label: L.DivIcon}
            points: {},
            routes: {},
            routePoints: {},
            temp: {}
        };
        this.editMode = null;
        this.imageBounds = null;
        this.coordsDisplay = null;
        this.initPromise = null;
        this.layerGroups = null;
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
				
				// Сохраняем путь к изображению
				this.currentImagePath = imagePath;
				
				// ДОБАВЛЕНО: Добавляем параметр версии для избежания кеширования
				const cacheBuster = '?v=' + new Date().getTime();
				const imageUrl = imagePath + cacheBuster;
				
				console.log('Загрузка изображения с параметром:', imageUrl);
				
				// Создаем карту
				this.map = L.map(mapContainerId, {
					crs: L.CRS.Simple,
					minZoom: -2,
					maxZoom: 2,
					zoomControl: false,
					attributionControl: false
				});

				// Устанавливаем границы для изображения 1920x1080
				this.imageBounds = [[1080, 0], [0, 1920]];
				
				// Добавляем изображение плана с параметром против кеширования
				this.imageOverlay = L.imageOverlay(imageUrl, this.imageBounds, {
					opacity: 1
				}).addTo(this.map);

				// Устанавливаем вид на весь план
				this.map.fitBounds(this.imageBounds);

				// Центрируем карту
				this.map.setView([540, 960], 0);

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

	changePlanImage(newImagePath) {
        return new Promise((resolve, reject) => {
            try {
                console.log('Смена изображения плана:', newImagePath);
                
                if (!this.map) {
                    reject(new Error('Карта не инициализирована'));
                    return;
                }
                
                // Добавляем параметр версии для избежания кеширования
                const cacheBuster = '?v=' + new Date().getTime();
                const imageUrl = newImagePath + cacheBuster;
                
                // Проверяем существование файла
                const img = new Image();
                img.onload = () => {
                    // Удаляем старое изображение
                    if (this.imageOverlay) {
                        this.map.removeLayer(this.imageOverlay);
                    }
                    
                    // Добавляем новое изображение
                    this.imageOverlay = L.imageOverlay(imageUrl, this.imageBounds, {
                        opacity: 1
                    }).addTo(this.map);
                    
                    // Сохраняем новый путь (без параметра версии)
                    this.currentImagePath = newImagePath;
                    
                    console.log('Изображение плана успешно обновлено');
                    
                    // Показываем уведомление
                    if (typeof Utils !== 'undefined') {
                        Utils.showNotification('План офиса обновлен', 'success');
                    }
                    
                    resolve(true);
                };
                
                img.onerror = () => {
                    console.error('Ошибка загрузки изображения:', newImagePath);
                    
                    if (typeof Utils !== 'undefined') {
                        Utils.showNotification('Не удалось загрузить изображение: ' + newImagePath, 'error');
                    }
                    
                    reject(new Error('Не удалось загрузить изображение: ' + newImagePath));
                };
                
                img.src = imageUrl;
                
            } catch (error) {
                console.error('Ошибка при смене изображения:', error);
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
        if (this.coordsDisplay && latlng) {
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
                this.layerGroups.temp.removeLayer(this.layers.temp[layerId]);
                delete this.layers.temp[layerId];
            }
        });
    }

    /**
     * Добавление кабинета на карту
     * @param {object} roomData - Данные кабинета
     * @returns {object|null} Созданный объект комнаты {polygon: L.Polygon, label: L.DivIcon}
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
                className: 'room-polygon',
                roomId: roomData.id // Добавляем кастомное свойство
            });

            // Добавляем на карту
            polygon.addTo(this.layerGroups.rooms);

            // Создаем подпись для комнаты
            const label = this.createRoomLabel(roomData);
            if (label) {
                label.addTo(this.layerGroups.rooms);
            }

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

            // Сохраняем объект комнаты
            const roomObject = {
                polygon: polygon,
                label: label,
                data: roomData
            };

            if (roomData.id) {
                this.layers.rooms[roomData.id] = roomObject;
                console.log('Кабинет добавлен на карту (слой сохранен):', roomData.id);
            }

            return roomObject;

        } catch (error) {
            console.error('Ошибка добавления кабинета на карту:', error);
            // Используем Utils если он доступен
            if (typeof Utils !== 'undefined' && Utils.showNotification) {
                Utils.showNotification('Ошибка добавления кабинета', 'error');
            }
            return null;
        }
    }

    /**
     * Создание подписи для комнаты
     * @param {object} roomData - Данные кабинета
     * @returns {L.DivIcon|null} Подпись комнаты
     */
    createRoomLabel(roomData) {
        try {
            if (!roomData.center || roomData.center.length !== 2) {
                // Вычисляем центр комнаты, если не предоставлен
                const center = this.calculatePolygonCenter(roomData.vertices);
                roomData.center = center;
            }

            const labelDiv = document.createElement('div');
            labelDiv.className = 'room-label';
            labelDiv.innerHTML = `
                <div style="
                    background: rgba(255, 255, 255, 0.9);
                    border: 1px solid ${roomData.color || '#3498db'};
                    border-radius: 4px;
                    padding: 2px 6px;
                    font-size: 12px;
                    font-weight: bold;
                    color: ${roomData.color || '#3498db'};
                    white-space: nowrap;
                    pointer-events: none;
                ">
                    ${Utils.escapeHtml(roomData.name)}
                </div>
            `;

            const label = L.divIcon({
                html: labelDiv,
                className: 'room-label-container',
                iconSize: null,
                iconAnchor: [0, 0]
            });

            return L.marker(roomData.center, { icon: label });
        } catch (error) {
            console.error('Ошибка создания подписи комнаты:', error);
            return null;
        }
    }

    /**
     * Вычисление центра полигона
     * @param {Array} vertices - Вершины полигона
     * @returns {Array} Координаты центра [y, x]
     */
    calculatePolygonCenter(vertices) {
        if (!vertices || vertices.length === 0) return [0, 0];
        
        let sumY = 0;
        let sumX = 0;
        
        for (const vertex of vertices) {
            sumY += vertex[0]; // y
            sumX += vertex[1]; // x
        }
        
        return [sumY / vertices.length, sumX / vertices.length];
    }

    /**
     * Создание popup для кабинета
     * @param {object} roomData - Данные кабинета
     * @returns {string} HTML содержимое popup
     */
    createRoomPopup(roomData) {
        const roomName = Utils.escapeHtml(roomData.name || 'Без названия');
        const roomColor = roomData.color || '#3498db';
        const department = Utils.escapeHtml(roomData.department || '-');
        const employees = Utils.escapeHtml(roomData.employees || '-');
        const phone = Utils.escapeHtml(roomData.phone || '-');
        const verticesCount = roomData.vertices?.length || 0;
        const area = (roomData.area || 0).toFixed(0);

        return `
            <div style="padding: 10px; max-width: 300px;">
                <h4 style="margin: 0 0 10px 0; color: ${roomColor}">
                    <i class="fas fa-door-closed"></i> ${roomName}
                </h4>
                <p><strong>Отдел:</strong> ${department}</p>
                <p><strong>Сотрудники:</strong> ${employees}</p>
                <p><strong>Телефон:</strong> ${phone}</p>
                <p><strong>Вершин:</strong> ${verticesCount}</p>
                <p><strong>Площадь:</strong> ${area} кв.ед.</p>
                <div style="margin-top: 10px; font-size: 12px; color: #666;">
                    <i class="fas fa-mouse-pointer"></i> Клик для выделения
                </div>
            </div>
        `;
    }

    /**
     * Обновление кабинета на карте
     * @param {string} roomId - ID кабинета
     * @param {object} roomData - Новые данные кабинета
     * @returns {object|null} Обновленный объект комнаты
     */
    updateRoom(roomId, roomData) {
        // Удаляем старый полигон
        if (this.layers.rooms[roomId]) {
            const oldRoom = this.layers.rooms[roomId];
            if (oldRoom.polygon) {
                this.layerGroups.rooms.removeLayer(oldRoom.polygon);
            }
            if (oldRoom.label) {
                this.layerGroups.rooms.removeLayer(oldRoom.label);
            }
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
            const room = this.layers.rooms[roomId];
            if (room.polygon) {
                this.layerGroups.rooms.removeLayer(room.polygon);
            }
            if (room.label) {
                this.layerGroups.rooms.removeLayer(room.label);
            }
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
        console.log('=== DEBUG highlightRoom ===');
        console.log('roomId:', roomId);
        console.log('this.layers.rooms:', this.layers.rooms);
        console.log('this.layers.rooms[roomId]:', this.layers.rooms[roomId]);
        
        // Проверяем, что roomId существует в слоях
        if (!roomId || !this.layers.rooms[roomId]) {
            console.warn('Комната не найдена для подсветки:', roomId);
            return;
        }
        
        // Получаем объект комнаты
        const room = this.layers.rooms[roomId];
        
        // Проверяем, что полигон существует
        if (!room || !room.polygon || typeof room.polygon.setStyle !== 'function') {
            console.error('room.polygon не является Leaflet полигоном или не имеет метода setStyle:', room);
            return;
        }
        
        try {
            // Сначала сбрасываем подсветку всех кабинетов
            Object.values(this.layers.rooms).forEach(roomObj => {
                if (roomObj && roomObj.polygon && typeof roomObj.polygon.setStyle === 'function') {
                    try {
                        const originalColor = roomObj.data?.color || '#3498db';
                        roomObj.polygon.setStyle({
                            color: originalColor,
                            fillColor: originalColor,
                            fillOpacity: 0.4,
                            weight: 2
                        });
                    } catch (error) {
                        console.warn('Ошибка при сбросе подсветки комнаты', roomObj.data?.id, ':', error);
                    }
                }
            });
            
            // Подсвечиваем выбранный кабинет
            room.polygon.setStyle({
                color: '#f39c12',
                fillColor: '#f39c12',
                fillOpacity: 0.3,
                weight: 4
            });
            
            // Открываем popup
            if (room.polygon.openPopup) {
                room.polygon.openPopup();
            }
            
            console.log('Комната успешно подсвечена:', roomId);
            
        } catch (error) {
            console.error('Ошибка подсветки комнаты:', error);
        }
    }

    /**
     * Сброс подсветки всех кабинетов
     */
    clearRoomHighlights() {
        Object.values(this.layers.rooms).forEach(roomObj => {
            if (roomObj && roomObj.polygon && typeof roomObj.polygon.setStyle === 'function') {
                try {
                    const originalColor = roomObj.data?.color || '#3498db';
                    roomObj.polygon.setStyle({
                        color: originalColor,
                        fillColor: originalColor,
                        fillOpacity: 0.4,
                        weight: 2
                    });
                } catch (error) {
                    console.warn('Ошибка при сбросе подсветки комнаты', roomObj.data?.id, ':', error);
                }
            }
        });
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
            if (typeof Utils !== 'undefined' && Utils.showNotification) {
                Utils.showNotification('Ошибка добавления точки', 'error');
            }
            return null;
        }
    }

    /**
     * Создание popup для точки
     * @param {object} pointData - Данные точки
     * @returns {string} HTML содержимое popup
     */
    createPointPopup(pointData) {
        const pointName = Utils.escapeHtml(pointData.name || 'Точка');
        const pointColor = pointData.color || '#e74c3c';
        const pointType = Utils.escapeHtml(pointData.type || '-');
        const pointDesc = Utils.escapeHtml(pointData.description || '-');
        const pointY = pointData.y || 0;
        const pointX = pointData.x || 0;

        return `
            <div style="padding: 10px; max-width: 300px;">
                <h4 style="margin: 0 0 10px 0; color: ${pointColor}">
                    <i class="fas fa-map-marker-alt"></i> ${pointName}
                </h4>
                <p><strong>Тип:</strong> ${pointType}</p>
                <p><strong>Координаты:</strong> y=${pointY}, x=${pointX}</p>
                <p><strong>Описание:</strong> ${pointDesc}</p>
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
            if (marker && marker.setStyle) {
                marker.setStyle({
                    radius: 8,
                    fillOpacity: 0.8
                });
            }
        });

        // Подсвечиваем выбранную точку
        if (this.layers.points[pointId] && this.layers.points[pointId].setStyle) {
            this.layers.points[pointId].setStyle({
                radius: 10,
                fillOpacity: 1
            });
            if (this.layers.points[pointId].openPopup) {
                this.layers.points[pointId].openPopup();
            }
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
            if (typeof Utils !== 'undefined' && Utils.showNotification) {
                Utils.showNotification('Ошибка добавления маршрута', 'error');
            }
            return null;
        }
    }

    /**
     * Создание popup для маршрута
     * @param {object} routeData - Данные маршрута
     * @returns {string} HTML содержимое popup
     */
    createRoutePopup(routeData) {
        const routeName = Utils.escapeHtml(routeData.name || 'Маршрут');
        const routeColor = routeData.color || '#2ecc71';
        const startName = Utils.escapeHtml(routeData.startName || 'Начало');
        const endName = Utils.escapeHtml(routeData.endName || 'Конец');
        const pointCount = routeData.points?.length || 0;
        const routeLength = (routeData.length || 0).toFixed(0);
        
        return `
            <div style="padding: 10px; max-width: 300px;">
                <h4 style="margin: 0 0 10px 0; color: ${routeColor}">
                    <i class="fas fa-route"></i> ${routeName}
                </h4>
                <p><strong>От:</strong> ${startName}</p>
                <p><strong>До:</strong> ${endName}</p>
                <p><strong>Точек маршрута:</strong> ${pointCount}</p>
                <p><strong>Длина:</strong> ${routeLength} ед.</p>
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
            if (polyline && polyline.setStyle) {
                polyline.setStyle({
                    weight: 3,
                    opacity: 0.8
                });
            }
        });

        // Подсвечиваем выбранный маршрут
        if (this.layers.routes[routeId] && this.layers.routes[routeId].setStyle) {
            this.layers.routes[routeId].setStyle({
                weight: 5,
                opacity: 1
            });
            if (this.layers.routes[routeId].openPopup) {
                this.layers.routes[routeId].openPopup();
            }
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
            if (group && group.clearLayers) {
                group.clearLayers();
            }
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

    /**
     * Получение центра карты
     * @returns {Array} Координаты центра [y, x]
     */
    getCenter() {
        const center = this.map.getCenter();
        return [center.lat, center.lng];
    }

    /**
     * Установка вида карты
     * @param {Array} center - Центр [y, x]
     * @param {number} zoom - Уровень масштабирования
     */
    setView(center, zoom) {
        if (center && center.length === 2) {
            this.map.setView([center[0], center[1]], zoom || 0);
        }
    }

    /**
     * Получение текущего масштаба
     * @returns {number} Текущий масштаб
     */
    getZoom() {
        return this.map.getZoom();
    }

    /**
     * Фитирование границ
     * @param {Array} bounds - Границы [[y_min, x_min], [y_max, x_max]]
     */
    fitBounds(bounds) {
        if (bounds && bounds.length === 2) {
            this.map.fitBounds(bounds);
        }
    }
}

// Экспортируем класс для глобального использования
window.MapCore = MapCore;
