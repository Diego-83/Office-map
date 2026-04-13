/**
 * РЕДАКТОР ПОЛИГОНОВ (КАБИНЕТОВ)
 * Финальная версия с исправленным редактированием и сохранением всех полей
 */

class PolygonsEditor {
    constructor(mapCore, dataManager) {
        this.mapCore = mapCore;
        this.dataManager = dataManager;
        
        this.currentPolygonId = null;
        this.isDrawing = false;
        this.isDragging = false;
        this.polygonPoints = [];
        this.tempPolygon = null;
        this.tempMarkers = [];
        this.originalMode = null;
        this.lastZoom = null;
        this.zoomTimeout = null;
        this.editingPolygonId = null;
        
        // Слой для подписей кабинетов
        this.labelsLayer = L.layerGroup();
        
        if (this.mapCore && this.mapCore.map) {
            this.mapCore.map.addLayer(this.labelsLayer);
        }
        
        this.handleMapClick = this.handleMapClick.bind(this);
        this.handleMapDblClick = this.handleMapDblClick.bind(this);
        this.handleZoomEnd = this.handleZoomEnd.bind(this);
        
        this.init();
    }

    init() {
        console.log('Инициализация редактора полигонов...');
        this.updateTabContent();
        this.bindEvents();
        this.bindFormValidation();
        
        if (this.mapCore && this.mapCore.map) {
            this.mapCore.map.on('zoomend', this.handleZoomEnd);
        }
        
        this.loadPolygonsToMap();
        this.renderPolygonsList();
    }

    updateTabContent() {
        const sectionHeader = document.querySelector('#rooms-tab .section-header');
        if (sectionHeader) {
            sectionHeader.innerHTML = '<i class="fas fa-plus-circle"></i> Добавить кабинет (полигон)';
        }
        
        const drawBtn = document.getElementById('draw-polygon-btn');
        if (drawBtn) {
            drawBtn.innerHTML = '<i class="fas fa-draw-polygon"></i> Рисовать полигон';
            drawBtn.title = 'Рисовать полигон (многоугольник)';
        }
        
        const cancelBtn = document.getElementById('cancel-draw-btn');
        if (cancelBtn) {
            cancelBtn.title = 'Отменить рисование полигона';
        }
    }

    loadPolygonsToMap() {
        const polygons = this.dataManager.getAllPolygons();
        console.log('Загрузка кабинетов на карту:', polygons.length);
        
        this.labelsLayer.clearLayers();
        
        polygons.forEach(polygon => {
            this.addRoom(polygon);
        });
    }

    bindEvents() {
        const drawBtn = document.getElementById('draw-polygon-btn');
        if (drawBtn) {
            drawBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.startDrawing();
            });
        }

        const cancelBtn = document.getElementById('cancel-draw-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.cancelDrawing();
            });
        }

        const saveBtn = document.getElementById('save-room-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.savePolygon();
            });
        }

        const finishDrawingBtn = document.getElementById('finish-drawing-btn');
        if (finishDrawingBtn) {
            finishDrawingBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.finishDrawing();
            });
        }

        const colorInput = document.getElementById('room-color');
        const colorText = document.getElementById('room-color-text');
        
        if (colorInput && colorText) {
            colorInput.addEventListener('input', (e) => {
                colorText.value = e.target.value;
                if (this.tempPolygon) {
                    this.tempPolygon.setStyle({ fillColor: e.target.value });
                }
            });
            
            colorText.addEventListener('input', (e) => {
                if (e.target.value.match(/^#[0-9A-F]{6}$/i)) {
                    colorInput.value = e.target.value;
                    if (this.tempPolygon) {
                        this.tempPolygon.setStyle({ fillColor: e.target.value });
                    }
                }
            });
        }

        document.getElementById('reset-rooms-btn')?.addEventListener('click', async () => {
            const confirmed = await Utils.showModal(
                'Сброс всех кабинетов',
                'Вы уверены, что хотите удалить ВСЕ кабинеты? Это действие необратимо!',
                'warning'
            );
            
            if (confirmed) {
                this.resetAllPolygons();
            }
        });

        const formFields = ['room-name', 'room-dept', 'room-employees', 'room-phone'];
        formFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => {
                    this.updateSaveButtonState();
                });
            }
        });
    }

    bindFormValidation() {
        const formFields = ['room-name', 'room-dept', 'room-employees', 'room-phone'];
        formFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => {
                    this.updateSaveButtonState();
                });
            }
        });
    }

    updateSaveButtonState() {
        const name = document.getElementById('room-name')?.value.trim() || '';
        const hasPolygon = this.polygonPoints.length >= 3 || this.editingPolygonId;
        const isValid = name !== '' && hasPolygon;
        
        const saveBtn = document.getElementById('save-room-btn');
        if (saveBtn) {
            saveBtn.disabled = !isValid;
            if (isValid) {
                saveBtn.title = 'Сохранить кабинет';
                saveBtn.classList.remove('btn-disabled');
            } else {
                if (!name) {
                    saveBtn.title = 'Введите название кабинета';
                } else if (!hasPolygon) {
                    saveBtn.title = 'Создайте полигон (минимум 3 вершины)';
                }
                saveBtn.classList.add('btn-disabled');
            }
        }
        
        return isValid;
    }

    startDrawing(editMode = false) {
        console.log('Начало рисования полигона...', editMode ? '(режим редактирования)' : '');
        
        if (!editMode) {
            this.cancelDrawing();
            this.currentPolygonId = null;
            this.editingPolygonId = null;
        }
        
        this.isDrawing = true;
        this.isDragging = false;
        
        this.originalMode = this.mapCore.getEditMode();
        this.mapCore.resetDrawingMode();
        this.mapCore.setEditMode('polygon');
        
        const drawBtn = document.getElementById('draw-polygon-btn');
        if (drawBtn) {
            drawBtn.classList.add('active');
        }
        
        const finishBtn = document.getElementById('finish-drawing-btn');
        if (finishBtn) {
            finishBtn.style.display = 'inline-flex';
        }
        
        this.setupDrawingHandlers();
        
        if (!editMode) {
            this.clearForm();
            Utils.showNotification('Кликните на карте чтобы добавить вершины полигона. Двойной клик или клик на первую точку - завершить.', 'info');
        }
    }

    setupDrawingHandlers() {
        this.mapCore.map.on('click', this.handleMapClick);
        this.mapCore.map.on('dblclick', this.handleMapDblClick);
    }

    removeDrawingHandlers() {
        this.mapCore.map.off('click', this.handleMapClick);
        this.mapCore.map.off('dblclick', this.handleMapDblClick);
    }

    handleMapClick(e) {
        if (this.isDragging) return;
        
        if (!this.isDrawing || this.mapCore.getEditMode() !== 'polygon') return;
        
        const point = [e.latlng.lat, e.latlng.lng];
        
        if (!Utils.isValidCoords(point[0], point[1])) {
            Utils.showNotification('Некорректные координаты', 'error');
            return;
        }
        
        if (this.polygonPoints.length >= 3) {
            const firstPoint = this.polygonPoints[0];
            const distance = Math.sqrt(
                Math.pow(point[0] - firstPoint[0], 2) + 
                Math.pow(point[1] - firstPoint[1], 2)
            );
            
            if (distance < 20) {
                this.finishDrawing();
                return;
            }
        }
        
        this.polygonPoints.push(point);
        this.addVertexMarker(point, this.polygonPoints.length - 1);
        this.updateTempPolygon();
        this.updateSaveButtonState();
        
        if (this.polygonPoints.length < 3) {
            Utils.showNotification(`Добавлено точек: ${this.polygonPoints.length}. Нужно минимум 3 для создания полигона.`, 'info');
        } else {
            Utils.showNotification(`Добавлено точек: ${this.polygonPoints.length}. Кликните на первую точку или сделайте двойной клик чтобы завершить.`, 'info');
        }
    }

    handleMapDblClick(e) {
        if (this.isDrawing && this.mapCore.getEditMode() === 'polygon' && !this.isDragging) {
            this.finishDrawing();
            e.originalEvent.stopPropagation();
        }
    }

    addVertexMarker(point, index) {
        console.log('✅ СОЗДАНИЕ МАРКЕРА ЧЕРЕЗ L.marker', index);
        
        const marker = L.marker(point, {
            draggable: true,
            title: `Вершина ${index + 1}`,
            zIndexOffset: 10000
        }).addTo(this.mapCore.map);
        
        marker.bindTooltip(`${index + 1}`, {
            permanent: true,
            direction: 'top',
            offset: [0, -10]
        });
        
        marker.on('dragstart', (e) => {
            console.log('🔵 Начало перетаскивания', index + 1);
            this.mapCore.map.dragging.disable();
            this.isDragging = true;
        });
        
        marker.on('drag', (e) => {
            const newPoint = [e.target.getLatLng().lat, e.target.getLatLng().lng];
            
            this.polygonPoints[index] = newPoint;
            
            if (this.tempPolygon) {
                try {
                    this.tempPolygon.setLatLngs(this.polygonPoints);
                } catch (err) {
                    console.log('Ошибка обновления полигона, создаем новый');
                    this.mapCore.map.removeLayer(this.tempPolygon);
                    const color = document.getElementById('room-color').value || '#3498db';
                    this.tempPolygon = L.polygon(this.polygonPoints, {
                        color: color,
                        weight: 4,
                        fillColor: color,
                        fillOpacity: 0.3
                    }).addTo(this.mapCore.map);
                }
            } else {
                const color = document.getElementById('room-color').value || '#3498db';
                this.tempPolygon = L.polygon(this.polygonPoints, {
                    color: color,
                    weight: 4,
                    fillColor: color,
                    fillOpacity: 0.3
                }).addTo(this.mapCore.map);
            }
        });
        
        marker.on('dragend', (e) => {
            console.log('🔴 Конец перетаскивания', index + 1);
            this.mapCore.map.dragging.enable();
            this.isDragging = false;
            document.getElementById('save-room-btn').disabled = false;
        });
        
        marker.on('contextmenu', (e) => {
            e.originalEvent.preventDefault();
            if (this.polygonPoints.length > 3) {
                this.removeVertex(index);
            } else {
                Utils.showNotification('Полигон должен иметь минимум 3 вершины', 'error');
            }
        });
        
        marker.on('mousedown', (e) => {
            e.originalEvent.stopPropagation();
        });
        
        this.tempMarkers.push(marker);
        return marker;
    }

    removeVertex(index) {
        if (this.polygonPoints.length <= 3) {
            Utils.showNotification('Полигон должен иметь минимум 3 вершины', 'error');
            return;
        }
        
        this.polygonPoints.splice(index, 1);
        
        if (this.tempMarkers[index]) {
            this.mapCore.map.removeLayer(this.tempMarkers[index]);
            this.tempMarkers.splice(index, 1);
        }
        
        this.updateTempPolygon();
        
        this.tempMarkers.forEach((marker, i) => {
            marker.setTooltipContent(`${i + 1}`);
        });
        
        this.updateSaveButtonState();
        Utils.showNotification(`Вершина удалена. Осталось: ${this.polygonPoints.length}`, 'info');
    }

    updateTempPolygon() {
        if (this.tempPolygon) {
            this.mapCore.map.removeLayer(this.tempPolygon);
        }
        
        if (this.polygonPoints.length >= 3) {
            const color = document.getElementById('room-color').value || '#3498db';
            
            this.tempPolygon = L.polygon(this.polygonPoints, {
                color: color,
                weight: 4,
                fillColor: color,
                fillOpacity: 0.3,
                dashArray: this.isDrawing ? '5, 5' : null
            }).addTo(this.mapCore.map);
        }
    }

    finishDrawing() {
        if (this.polygonPoints.length < 3) {
            if (!this.editingPolygonId) {
                Utils.showNotification('Полигон должен иметь минимум 3 вершины', 'error');
            }
            return;
        }
        
        console.log('Завершение рисования полигона с', this.polygonPoints.length, 'вершинами');
        
        this.isDrawing = false;
        this.isDragging = false;
        
        const drawBtn = document.getElementById('draw-polygon-btn');
        if (drawBtn) {
            drawBtn.classList.remove('active');
        }
        
        const finishBtn = document.getElementById('finish-drawing-btn');
        if (finishBtn) {
            finishBtn.style.display = 'none';
        }
        
        this.removeDrawingHandlers();
        
        if (this.tempPolygon) {
            this.tempPolygon.setStyle({ dashArray: null });
        }
        
        this.mapCore.setEditMode(this.originalMode);
        this.updateSaveButtonState();
        
        if (!this.editingPolygonId) {
            Utils.showNotification(
                `Полигон готов к сохранению! Вершин: ${this.polygonPoints.length}`, 
                'success'
            );
        }
    }

    cancelDrawing() {
        console.log('Отмена рисования полигона...');
        
        this.isDrawing = false;
        this.isDragging = false;
        this.removeDrawingHandlers();
        this.clearTempLayers();
        
        this.polygonPoints = [];
        
        if (!this.editingPolygonId) {
            this.clearForm();
        }
        
        const finishBtn = document.getElementById('finish-drawing-btn');
        if (finishBtn) {
            finishBtn.style.display = 'none';
        }
        
        const drawBtn = document.getElementById('draw-polygon-btn');
        if (drawBtn) {
            drawBtn.classList.remove('active');
        }
        
        if (this.originalMode !== null) {
            this.mapCore.setEditMode(this.originalMode);
            this.originalMode = null;
        } else {
            this.mapCore.setEditMode(null);
        }
        
        this.updateSaveButtonState();
        Utils.showNotification('Рисование полигона отменено', 'info');
    }

    clearTempLayers() {
        if (this.tempPolygon) {
            this.mapCore.map.removeLayer(this.tempPolygon);
            this.tempPolygon = null;
        }
        
        this.tempMarkers.forEach(marker => {
            if (marker && this.mapCore.map.hasLayer(marker)) {
                this.mapCore.map.removeLayer(marker);
            }
        });
        this.tempMarkers = [];
    }

    clearForm() {
        const roomName = document.getElementById('room-name');
        const roomDept = document.getElementById('room-dept');
        const roomEmployees = document.getElementById('room-employees');
        const roomPhone = document.getElementById('room-phone');
        const roomColor = document.getElementById('room-color');
        const roomColorText = document.getElementById('room-color-text');
        
        if (roomName) roomName.value = '';
        if (roomDept) roomDept.value = '';
        if (roomEmployees) roomEmployees.value = '';
        if (roomPhone) roomPhone.value = '';
        if (roomColor) roomColor.value = '#3498db';
        if (roomColorText) roomColorText.value = '#3498db';
        
        this.currentPolygonId = null;
        this.updateSaveButtonState();
    }

    getClosedPolygonPoints() {
        if (this.polygonPoints.length < 3) return [...this.polygonPoints];
        
        const points = [...this.polygonPoints];
        const first = points[0];
        const last = points[points.length - 1];
        
        if (first[0] !== last[0] || first[1] !== last[1]) {
            points.push([...first]);
        }
        
        return points;
    }

    getClosedPolygonPointsFromArray(points) {
        if (!points || points.length < 3) return [...points];
        
        const result = [...points];
        const first = result[0];
        const last = result[result.length - 1];
        
        if (first[0] !== last[0] || first[1] !== last[1]) {
            result.push([...first]);
        }
        
        return result;
    }

    /**
     * Загрузка данных кабинета в форму для редактирования - ИСПРАВЛЕННАЯ ВЕРСИЯ
     */
    loadRoomDataToForm(roomId) {
        console.log('Загрузка данных кабинета в форму:', roomId);
        
        const room = this.dataManager.getPolygon(roomId);
        if (!room) {
            console.error('Кабинет не найден:', roomId);
            return false;
        }
        
        console.log('Данные из dataManager:', room);
        
        // Заполняем форму
        const nameInput = document.getElementById('room-name');
        const deptInput = document.getElementById('room-dept');
        const employeesInput = document.getElementById('room-employees');
        const phoneInput = document.getElementById('room-phone');
        const colorInput = document.getElementById('room-color');
        const colorText = document.getElementById('room-color-text');
        
        if (nameInput) {
            nameInput.value = room.name || '';
            console.log('Загружено имя:', room.name);
        }
        
        if (deptInput) {
            deptInput.value = room.department || '';
            console.log('Загружен отдел:', room.department);
        }
        
        if (employeesInput) {
            employeesInput.value = room.employees || '';
            console.log('Загружены сотрудники:', room.employees);
        }
        
        if (phoneInput) {
            phoneInput.value = room.phone || '';
            console.log('Загружен телефон:', room.phone);
        }
        
        if (colorInput) {
            colorInput.value = room.color || '#3498db';
        }
        
        if (colorText) {
            colorText.value = room.color || '#3498db';
        }
        
        this.editingPolygonId = roomId;
        this.currentPolygonId = roomId;
        
        this.updateSaveButtonState();
        
        console.log('✅ Данные загружены в форму:', {
            name: room.name,
            department: room.department,
            employees: room.employees,
            phone: room.phone,
            color: room.color
        });
        
        return true;
    }

    /**
     * Обновление кабинета на карте
     */
    updateRoomOnMap(roomData) {
        if (!roomData || !roomData.id) return;
        
        if (this.mapCore.layers.rooms[roomData.id]) {
            const oldPolygon = this.mapCore.layers.rooms[roomData.id].polygon;
            if (oldPolygon) {
                this.mapCore.map.removeLayer(oldPolygon);
            }
            
            const oldLabel = this.mapCore.layers.rooms[roomData.id].label;
            if (oldLabel) {
                this.labelsLayer.removeLayer(oldLabel);
            }
            
            delete this.mapCore.layers.rooms[roomData.id];
        }
        
        this.addRoom(roomData);
    }

    /**
     * Сохранение полигона - ИСПРАВЛЕННАЯ ВЕРСИЯ
     */
    async savePolygon() {
        console.log('Сохранение полигона...');
        
        if (this.isDrawing) {
            this.finishDrawing();
        }
        
        // ПОЛУЧАЕМ ДАННЫЕ ИЗ ФОРМЫ
        const name = document.getElementById('room-name').value.trim();
        const department = document.getElementById('room-dept').value.trim();
        const employees = document.getElementById('room-employees').value.trim();
        const phone = document.getElementById('room-phone').value.trim();
        const color = document.getElementById('room-color').value;
        
        console.log('Данные из формы:', { name, department, employees, phone, color });
        
        // Проверяем название
        if (!name) {
            Utils.showNotification('Введите название кабинета', 'error');
            return null;
        }
        
        // Определяем вершины
        let vertices = this.polygonPoints;
        
        // Если мы в режиме редактирования и текущие вершины пусты, используем сохраненные
        if (this.editingPolygonId && (!vertices || vertices.length < 3)) {
            const existingRoom = this.dataManager.getPolygon(this.editingPolygonId);
            if (existingRoom && existingRoom.vertices && existingRoom.vertices.length >= 3) {
                vertices = existingRoom.vertices;
                console.log('Используем существующие вершины из dataManager');
            }
        }
        
        // Проверяем вершины
        if (!vertices || vertices.length < 3) {
            Utils.showNotification('Полигон должен иметь минимум 3 вершины', 'error');
            return null;
        }
        
        const closedVertices = this.getClosedPolygonPointsFromArray(vertices);
        
        const polygonData = {
            name: name,
            department: department,
            employees: employees,
            phone: phone,
            color: color,
            vertices: closedVertices,
            area: Utils.calculatePolygonArea(closedVertices)
        };

        console.log('Сохранение данных:', polygonData);

        try {
            let polygon;
            
            if (this.editingPolygonId) {
                console.log('Обновление существующего кабинета:', this.editingPolygonId);
                
                polygon = this.dataManager.updatePolygon(this.editingPolygonId, polygonData);
                
                if (polygon) {
                    this.updateRoomOnMap(polygon);
                    Utils.showNotification('Кабинет обновлен', 'success');
                } else {
                    throw new Error('Не удалось обновить кабинет');
                }
                
            } else {
                polygon = this.dataManager.addPolygon(polygonData);
                
                if (polygon && polygon.id) {
                    this.addRoom(polygon);
                    Utils.showNotification('Кабинет сохранен', 'success');
                } else {
                    throw new Error('Не удалось создать полигон');
                }
            }
            
            // Обновляем UI
            this.renderPolygonsList();
            
            if (window.app && window.app.routingEditor && window.app.routingEditor.updateTestSelects) {
                window.app.routingEditor.updateTestSelects();
            }
            
            if (window.app && window.app.updateStats) {
                window.app.updateStats();
            }
            
            // Сбрасываем состояние
            this.resetAfterSave();
            
            // Явно отключаем режим редактирования
            this.mapCore.setEditMode(null);
            
            return polygon;
            
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            Utils.showNotification('Ошибка сохранения: ' + error.message, 'error');
            return null;
        }
    }

    resetAfterSave() {
        console.log('Сброс после сохранения');
        
        this.clearForm();
        this.clearTempLayers();
        this.polygonPoints = [];
        this.currentPolygonId = null;
        this.editingPolygonId = null;
        this.isDrawing = false;
        this.isDragging = false;
        this.originalMode = null;
        this.updateSaveButtonState();
        
        const drawBtn = document.getElementById('draw-polygon-btn');
        if (drawBtn) drawBtn.classList.remove('active');
        
        const finishBtn = document.getElementById('finish-drawing-btn');
        if (finishBtn) finishBtn.style.display = 'none';
    }

    validateForm() {
        return this.updateSaveButtonState();
    }

    /**
     * Редактирование кабинета - ИСПРАВЛЕННАЯ ВЕРСИЯ
     */
    editPolygon(polygonId) {
        const polygon = this.dataManager.getPolygon(polygonId);
        if (!polygon) {
            console.error('Кабинет не найден:', polygonId);
            return;
        }

        console.log('Редактирование кабинета:', polygonId);
        console.log('Данные кабинета для редактирования:', polygon);
        
        // Сначала сбрасываем предыдущее состояние
        this.resetAfterSave();
        
        // ЗАГРУЖАЕМ ДАННЫЕ В ФОРМУ
        this.loadRoomDataToForm(polygonId);

        // Подготавливаем вершины (убираем замыкающую если есть)
        let vertices = [...polygon.vertices];
        if (vertices.length > 0) {
            const first = vertices[0];
            const last = vertices[vertices.length - 1];
            
            if (first[0] === last[0] && first[1] === last[1] && vertices.length > 3) {
                vertices.pop();
            }
        }
        
        this.polygonPoints = vertices;
        
        // Запускаем режим рисования
        this.startDrawing(true);
        
        // Создаем маркеры для вершин
        if (this.polygonPoints.length >= 3) {
            this.polygonPoints.forEach((point, index) => {
                this.addVertexMarker(point, index);
            });
            
            // Создаем временный полигон
            const color = polygon.color || '#3498db';
            this.tempPolygon = L.polygon(this.polygonPoints, {
                color: color,
                weight: 4,
                fillColor: color,
                fillOpacity: 0.3,
                dashArray: '5, 5'
            }).addTo(this.mapCore.map);
            
            // Центрируем карту на кабинете
            const bounds = L.latLngBounds(this.polygonPoints);
            this.mapCore.map.fitBounds(bounds, { padding: [50, 50] });
        }
        
        this.updateSaveButtonState();

        // Переключаемся на вкладку кабинетов
        document.querySelectorAll('.tab').forEach(tab => {
            if (tab.dataset.tab === 'rooms') {
                tab.click();
            }
        });

        Utils.showNotification(
            `Редактирование кабинета "${polygon.name}"<br>` +
            `🖱️ Перетаскивайте вершины для изменения формы`, 
            'info'
        );
    }

    renderPolygonsList() {
        try {
            const polygons = this.dataManager.getAllPolygons();
            const container = document.getElementById('rooms-list');
            
            if (!container) return;
            
            if (polygons.length === 0) {
                container.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: #666;">
                        <i class="fas fa-draw-polygon" style="font-size: 2em; margin-bottom: 10px; display: block;"></i>
                        Нет созданных кабинетов
                    </div>
                `;
                return;
            }
            
            const html = polygons.map(polygon => {
                const isActive = this.currentPolygonId === polygon.id;
                
                return `
                    <div class="object-item ${isActive ? 'active' : ''}" data-id="${polygon.id}">
                        <div class="object-header">
                            <div class="object-name">
                                <i class="fas fa-draw-polygon" style="color: ${polygon.color}; margin-right: 8px;"></i>
                                ${Utils.escapeHtml(polygon.name)}
                            </div>
                            <div class="object-actions">
                                <button class="btn-icon edit-polygon" title="Редактировать">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon delete-polygon" title="Удалить">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <div style="font-size: 0.9em; color: #666; margin-top: 5px;">
                            ${Utils.escapeHtml(polygon.department || 'Нет отдела')}
                            <span style="float: right; font-size: 0.8em; color: #888;">
                                ${polygon.vertices?.length || 0} вершин
                            </span>
                        </div>
                    </div>
                `;
            }).join('');
            
            container.innerHTML = html;
            
            container.querySelectorAll('.object-item').forEach(item => {
                const polygonId = item.dataset.id;
                
                item.addEventListener('click', (e) => {
                    if (!e.target.closest('.btn-icon')) {
                        this.selectPolygon(polygonId);
                    }
                });
                
                const editBtn = item.querySelector('.edit-polygon');
                if (editBtn) {
                    editBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.editPolygon(polygonId);
                    });
                }
                
                const deleteBtn = item.querySelector('.delete-polygon');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.deletePolygon(polygonId);
                    });
                }
            });
            
        } catch (error) {
            console.error('Ошибка рендеринга списка:', error);
        }
    }

    selectPolygon(polygonId) {
        const polygon = this.dataManager.getPolygon(polygonId);
        if (!polygon) return;

        console.log('Выбор кабинета:', polygonId);
        this.mapCore.highlightRoom(polygonId);
        this.currentPolygonId = polygonId;
        this.renderPolygonsList();
    }

    addRoom(roomData) {
        if (!roomData || !roomData.vertices || roomData.vertices.length < 3) {
            console.error('Неверные данные кабинета:', roomData);
            return null;
        }

        try {
            const polygon = L.polygon(roomData.vertices, {
                color: roomData.color || '#3498db',
                weight: 2,
                fillColor: roomData.color || '#3498db',
                fillOpacity: 0.4,
                className: 'room-polygon'
            });

            polygon.addTo(this.mapCore.layerGroups.rooms);

            const center = Utils.getPolygonCenter(roomData.vertices);
            if (center && center.length === 2) {
                const label = this.createRoomLabel(roomData, center);
                if (label) {
                    label.addTo(this.labelsLayer);
                    roomData._label = label;
                }
            }

            const popupContent = this.createRoomPopup(roomData);
            polygon.bindPopup(popupContent, { maxWidth: 300 });

            polygon.on('click', () => {
                if (roomData.id) {
                    this.highlightRoom(roomData.id);
                }
            });

            if (roomData.id) {
                this.mapCore.layers.rooms[roomData.id] = { polygon, label: roomData._label };
            }

            console.log('Кабинет добавлен на карту:', roomData.id);
            return polygon;

        } catch (error) {
            console.error('Ошибка добавления кабинета:', error);
            return null;
        }
    }

    updateRoom(roomId, roomData) {
        console.log('Обновление кабинета на карте:', roomId);
        this.removeRoom(roomId);
        this.addRoom(roomData);
    }

    removeRoom(roomId) {
        console.log('Удаление кабинета с карты:', roomId);
        this.removeRoomLabel(roomId);
        
        if (this.mapCore && typeof this.mapCore.removeRoom === 'function') {
            this.mapCore.removeRoom(roomId);
        }
    }

    removeRoomLabel(roomId) {
        const roomData = this.dataManager.getPolygon(roomId);
        if (!roomData) return;

        if (roomData._label && this.labelsLayer.hasLayer(roomData._label)) {
            this.labelsLayer.removeLayer(roomData._label);
        }
    }

    createRoomLabel(roomData, center) {
        try {
            const zoom = this.mapCore.map.getZoom();
            let scaleFactor;
            
            if (zoom < 0) {
                scaleFactor = 1 + (Math.abs(zoom) * 0.5);
            } else if (zoom > 0) {
                scaleFactor = 1 / (1 + (zoom * 0.5));
            } else {
                scaleFactor = 1;
            }
            
            scaleFactor = Math.min(Math.max(scaleFactor, 0.4), 3);
            
            const fontSize = Math.round(14 * scaleFactor);
            const padding = Math.max(4, Math.round(6 * scaleFactor));
            const borderWidth = Math.max(1, Math.round(2 * scaleFactor));
            const maxWidth = Math.round(200 * scaleFactor);
            
            const escapedText = Utils.escapeHtml(roomData.name);
            
            const icon = L.divIcon({
                className: 'room-label',
                html: `
                    <div class="room-label-content" style="
                        background-color: rgba(255, 255, 255, 0.95);
                        padding: ${padding}px ${padding * 2}px;
                        border-radius: 4px;
                        border: ${borderWidth}px solid ${roomData.color || '#3498db'};
                        color: #333;
                        font-weight: bold;
                        font-size: ${fontSize}px;
                        text-align: center;
                        white-space: normal;
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                        max-width: ${maxWidth}px;
                        min-width: 50px;
                        width: auto;
                        height: auto;
                        line-height: 1.4;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                        pointer-events: none;
                    ">
                        ${escapedText}
                    </div>
                `,
                iconSize: null,
                iconAnchor: [0, 0]
            });

            return L.marker(center, {
                icon: icon,
                interactive: false,
                zIndexOffset: 1000
            });

        } catch (error) {
            console.error('Ошибка создания подписи:', error);
            return null;
        }
    }

    createRoomPopup(roomData) {
        const area = Utils.calculatePolygonArea(roomData.vertices);
        
        const department = roomData.department || '';
        const employees = roomData.employees || '';
        const phone = roomData.phone || '';
        
        let detailsHtml = '';
        if (department) detailsHtml += `<p><strong><i class="fas fa-users"></i> Отдел:</strong> ${Utils.escapeHtml(department)}</p>`;
        if (employees) detailsHtml += `<p><strong><i class="fas fa-user-tie"></i> Сотрудники:</strong> ${Utils.escapeHtml(employees)}</p>`;
        if (phone) detailsHtml += `<p><strong><i class="fas fa-phone"></i> Телефон:</strong> ${Utils.escapeHtml(phone)}</p>`;
        
        return `
            <div style="padding: 15px; max-width: 300px;">
                <h4 style="margin: 0 0 10px 0; color: ${roomData.color || '#3498db'}; border-bottom: 2px solid ${roomData.color || '#3498db'}; padding-bottom: 5px;">
                    <i class="fas fa-door-closed"></i> ${Utils.escapeHtml(roomData.name)}
                </h4>
                <div style="margin: 10px 0;">
                    <strong>Площадь:</strong> ${Utils.round(area)} кв.ед.<br>
                    <strong>Вершин:</strong> ${roomData.vertices.length}<br>
                    ${detailsHtml}
                </div>
                <div style="margin-top: 15px; display: flex; gap: 5px;">
                    <button onclick="window.app.polygonsEditor.editPolygon('${roomData.id}')" 
                            style="background: #3498db; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;">
                        <i class="fas fa-edit"></i> Редактировать
                    </button>
                    <button onclick="window.app.polygonsEditor.deletePolygon('${roomData.id}')" 
                            style="background: #e74c3c; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;">
                        <i class="fas fa-trash"></i> Удалить
                    </button>
                </div>
            </div>
        `;
    }

    highlightRoom(roomId) {
        if (this.mapCore && typeof this.mapCore.highlightRoom === 'function') {
            this.mapCore.highlightRoom(roomId);
        }
    }

    async deletePolygon(polygonId) {
        const polygon = this.dataManager.getPolygon(polygonId);
        if (!polygon) return false;

        console.log('Удаление кабинета:', polygonId);
        
        const confirmed = await Utils.showModal(
            'Удаление кабинета',
            `Вы уверены, что хотите удалить кабинет "${polygon.name}"?`
        );

        if (confirmed) {
            const success = this.dataManager.deletePolygon(polygonId);
            
            if (success) {
                this.removeRoom(polygonId);
                this.renderPolygonsList();
                
                if (this.currentPolygonId === polygonId || this.editingPolygonId === polygonId) {
                    this.cancelDrawing();
                    this.clearForm();
                }
                
                if (window.app && window.app.routingEditor && window.app.routingEditor.updateTestSelects) {
                    window.app.routingEditor.updateTestSelects();
                }
                
                if (window.app && window.app.updateStats) {
                    window.app.updateStats();
                }
                
                Utils.showNotification('Кабинет удален', 'success');
                return true;
            } else {
                Utils.showNotification('Ошибка удаления кабинета', 'error');
                return false;
            }
        }
        return false;
    }

    resetAllPolygons() {
        this.labelsLayer.clearLayers();
        this.dataManager.clearRooms();
        
        if (this.mapCore && typeof this.mapCore.clearAllLayers === 'function') {
            this.mapCore.clearAllLayers();
        }
        
        this.renderPolygonsList();
        this.cancelDrawing();
        this.clearForm();
        
        if (window.app && window.app.routingEditor && window.app.routingEditor.updateTestSelects) {
            window.app.routingEditor.updateTestSelects();
        }
        
        if (window.app && window.app.updateStats) {
            window.app.updateStats();
        }
        
        Utils.showNotification('Все кабинеты удалены', 'success');
        return true;
    }

    handleZoomEnd() {
        console.log('Обновление подписей после зумирования...');
        
        if (this.zoomTimeout) {
            clearTimeout(this.zoomTimeout);
        }
        
        this.zoomTimeout = setTimeout(() => {
            const polygons = this.dataManager.getAllPolygons();
            this.labelsLayer.clearLayers();
            
            polygons.forEach(polygon => {
                if (polygon && polygon.vertices && polygon.vertices.length >= 3) {
                    const center = Utils.getPolygonCenter(polygon.vertices);
                    if (center && center.length === 2) {
                        const label = this.createRoomLabel(polygon, center);
                        if (label) {
                            label.addTo(this.labelsLayer);
                            polygon._label = label;
                            
                            if (this.mapCore.layers.rooms[polygon.id]) {
                                this.mapCore.layers.rooms[polygon.id].label = label;
                            }
                        }
                    }
                }
            });
            
            this.zoomTimeout = null;
        }, 100);
    }

    getCurrentPolygon() {
        if (this.currentPolygonId) {
            return this.dataManager.getPolygon(this.currentPolygonId);
        }
        return null;
    }

    isPointInCurrentPolygon(y, x) {
        if (!this.currentPolygonId || this.polygonPoints.length < 3) {
            return false;
        }
        return Utils.isPointInPolygon([y, x], this.getClosedPolygonPoints());
    }
}

window.PolygonsEditor = PolygonsEditor;
