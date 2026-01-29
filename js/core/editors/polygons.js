/**
 * Редактор полигонов (кабинетов)
 */

class PolygonsEditor {
    constructor(mapCore, dataManager) {
        this.mapCore = mapCore;
        this.dataManager = dataManager;
        
        this.currentPolygonId = null;
        this.isDrawing = false;
        this.polygonPoints = [];
        this.tempPolygon = null;
        this.tempMarkers = [];
        this.originalMode = null;
        
        // Привязка контекста для обработчиков
        this.handleMapClick = this.handleMapClick.bind(this);
        this.handleMapDblClick = this.handleMapDblClick.bind(this);
        
        this.init();
    }

    /**
     * Инициализация редактора
     */
    init() {
        console.log('Инициализация редактора полигонов...');
        this.updateTabContent();
        this.bindEvents();
        this.bindFormValidation();
        this.renderPolygonsList();
        
        // Загружаем существующие кабинеты на карту
        this.loadPolygonsToMap();
    }

    /**
     * Обновление содержимого вкладки
     */
    updateTabContent() {
        // Обновляем заголовок секции
        const sectionHeader = document.querySelector('#rooms-tab .section-header');
        if (sectionHeader) {
            sectionHeader.innerHTML = '<i class="fas fa-plus-circle"></i> Добавить кабинет (полигон)';
        }
        
        // Обновляем кнопку рисования
        const drawBtn = document.getElementById('draw-polygon-btn');
        if (drawBtn) {
            drawBtn.innerHTML = '<i class="fas fa-draw-polygon"></i> Рисовать полигон';
            drawBtn.title = 'Рисовать полигон (многоугольник)';
        }
        
        // Обновляем подсказки
        const cancelBtn = document.getElementById('cancel-draw-btn');
        if (cancelBtn) {
            cancelBtn.title = 'Отменить рисование полигона';
        }
    }

    /**
     * Загрузка полигонов на карту
     */
    loadPolygonsToMap() {
        const polygons = this.dataManager.getAllPolygons();
        console.log('Загрузка кабинетов на карту:', polygons.length);
        
        polygons.forEach(polygon => {
            this.mapCore.addRoom(polygon);
        });
    }

    /**
     * Привязка событий UI
     */
    bindEvents() {
        // Кнопка рисования полигона
        const drawBtn = document.getElementById('draw-polygon-btn');
        if (drawBtn) {
            drawBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.startDrawing();
            });
        }

        // Кнопка отмены
        const cancelBtn = document.getElementById('cancel-draw-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.cancelDrawing();
            });
        }

        // Кнопка сохранения
        const saveBtn = document.getElementById('save-room-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.savePolygon();
            });
        }

        // Кнопка завершения рисования
        const finishDrawingBtn = document.getElementById('finish-drawing-btn');
        if (finishDrawingBtn) {
            finishDrawingBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.finishDrawing();
            });
        }

        // Цветовой инпут
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

        // Кнопка сброса всех кабинетов
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

        // Предотвращаем отправку формы по Enter
        const form = document.querySelector('#rooms-tab form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.savePolygon();
            });
        }

        // Обработка изменений в полях формы
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

    /**
     * Привязка валидации формы
     */
    bindFormValidation() {
        // Валидация при вводе в поля формы
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

    /**
     * Обновление состояния кнопки сохранения
     * @returns {boolean} Валидна ли форма
     */
    updateSaveButtonState() {
        const name = document.getElementById('room-name')?.value.trim() || '';
        const hasPolygon = this.polygonPoints.length >= 3;
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

    /**
     * Начало рисования полигона
     */
    startDrawing() {
        console.log('Начало рисования полигона...');
        
        // Сбрасываем текущее состояние
        this.cancelDrawing();
        
        this.isDrawing = true;
        this.polygonPoints = [];
        this.currentPolygonId = null;
        
        // Сохраняем оригинальный режим
        this.originalMode = this.mapCore.getEditMode();
        
        // Сбрасываем режимы других редакторов
        this.mapCore.resetDrawingMode();
        this.mapCore.setEditMode('polygon');
        
        // Обновляем UI
        const drawBtn = document.getElementById('draw-polygon-btn');
        if (drawBtn) {
            drawBtn.classList.add('active');
        }
        
        // Показываем кнопку завершения
        const finishBtn = document.getElementById('finish-drawing-btn');
        if (finishBtn) {
            finishBtn.style.display = 'inline-flex';
        }
        
        // Очищаем форму
        this.clearForm();
        
        // Добавляем обработчики
        this.setupDrawingHandlers();
        
        Utils.showNotification('Кликните на карте чтобы добавить вершины полигона. Двойной клик или клик на первую точку - завершить.', 'info');
    }

    /**
     * Настройка обработчиков рисования
     */
    setupDrawingHandlers() {
        // Добавляем обработчики
        this.mapCore.map.on('click', this.handleMapClick);
        this.mapCore.map.on('dblclick', this.handleMapDblClick);
    }

    /**
	 * Обработчик клика на карте
	 * @param {L.LeafletMouseEvent} e - Событие клика
	 */
	handleMapClick(e) {
		if (!this.isDrawing || this.mapCore.getEditMode() !== 'polygon') return;
		
		const point = [e.latlng.lat, e.latlng.lng];
		console.log('Добавление вершины полигона:', point);
		
		// Проверяем валидность координат (для CRS.Simple любые числовые координаты валидны)
		if (!Utils.isValidCoords(point[0], point[1])) {
			Utils.showNotification('Некорректные координаты', 'error');
			return;
		}
		
		// Дополнительная проверка: координаты в пределах изображения (0-1080 по Y, 0-1920 по X)
		if (this.mapCore.imageBounds) {
			const [min, max] = this.mapCore.imageBounds;
			const padding = 50; // небольшой отступ от краев
			
			if (point[0] < min[0] - padding || point[0] > max[0] + padding ||
				point[1] < min[1] - padding || point[1] > max[1] + padding) {
				Utils.showNotification('Координаты слишком далеко от изображения', 'warning');
			}
		}
		
		// Проверяем если кликнули на первую точку (завершение)
		if (this.polygonPoints.length >= 3) {
			const firstPoint = this.polygonPoints[0];
			const distance = Math.sqrt(
				Math.pow(point[0] - firstPoint[0], 2) + 
				Math.pow(point[1] - firstPoint[1], 2)
			);
			
			// Если кликнули близко к первой точке (завершаем полигон)
			// Увеличиваем радиус для более легкого завершения
			if (distance < 20) { // было 0.0005
				this.finishDrawing();
				return;
			}
		}
		
		// Добавляем точку
		this.polygonPoints.push(point);
		
		// Создаем или обновляем маркер
		this.addVertexMarker(point, this.polygonPoints.length - 1);
		
		// Обновляем полигон
		this.updateTempPolygon();
		
		// Обновляем состояние кнопки сохранения
		this.updateSaveButtonState();
		
		// Показываем инструкцию
		if (this.polygonPoints.length < 3) {
			Utils.showNotification(`Добавлено точек: ${this.polygonPoints.length}. Нужно минимум 3 для создания полигона.`, 'info');
		} else {
			Utils.showNotification(`Добавлено точек: ${this.polygonPoints.length}. Кликните на первую точку или сделайте двойной клик чтобы завершить.`, 'info');
		}
	}

    /**
     * Обработчик двойного клика на карте
     * @param {L.LeafletMouseEvent} e - Событие двойного клика
     */
    handleMapDblClick(e) {
        if (this.isDrawing && this.mapCore.getEditMode() === 'polygon') {
            this.finishDrawing();
            e.originalEvent.stopPropagation();
        }
    }

    /**
     * Добавление маркера вершины
     * @param {Array} point - Точка [y, x]
     * @param {number} index - Индекс вершины
     * @returns {L.CircleMarker} Маркер вершины
     */
    addVertexMarker(point, index) {
        // Создаем маркер вершины
        const marker = L.circleMarker(point, {
            radius: 6,
            color: '#3498db',
            fillColor: '#3498db',
            fillOpacity: 0.8,
            weight: 2,
            draggable: true
        }).addTo(this.mapCore.map);
        
        // Подсказка
        marker.bindTooltip(`Вершина ${index + 1}<br>Перетащите для перемещения`, {
            permanent: false,
            direction: 'top'
        });
        
        // Обработчик перетаскивания
        marker.on('drag', (e) => {
            const newPoint = [e.target.getLatLng().lat, e.target.getLatLng().lng];
            this.polygonPoints[index] = newPoint;
            this.updateTempPolygon();
            this.updateVertexMarkers();
        });
        
        // Обработчик удаления вершины (по правому клику)
        marker.on('contextmenu', (e) => {
            e.originalEvent.preventDefault();
            if (this.polygonPoints.length > 3) {
                this.removeVertex(index);
            }
        });
        
        this.tempMarkers.push(marker);
        return marker;
    }

    /**
     * Обновление позиций маркеров вершин
     */
    updateVertexMarkers() {
        // Обновляем позиции всех маркеров
        this.tempMarkers.forEach((marker, index) => {
            if (this.polygonPoints[index]) {
                marker.setLatLng(this.polygonPoints[index]);
            }
        });
    }

    /**
     * Удаление вершины
     * @param {number} index - Индекс вершины
     */
    removeVertex(index) {
        if (this.polygonPoints.length <= 3) {
            Utils.showNotification('Полигон должен иметь минимум 3 вершины', 'error');
            return;
        }
        
        // Удаляем точку
        this.polygonPoints.splice(index, 1);
        
        // Удаляем маркер
        if (this.tempMarkers[index]) {
            this.mapCore.map.removeLayer(this.tempMarkers[index]);
            this.tempMarkers.splice(index, 1);
        }
        
        // Обновляем полигон и маркеры
        this.updateTempPolygon();
        this.updateVertexMarkers();
        
        // Переиндексируем оставшиеся маркеры
        this.tempMarkers.forEach((marker, i) => {
            marker.setTooltipContent(`Вершина ${i + 1}<br>Перетащите для перемещения`);
        });
        
        // Обновляем состояние кнопки сохранения
        this.updateSaveButtonState();
        
        Utils.showNotification(`Вершина ${index + 1} удалена. Осталось: ${this.polygonPoints.length}`, 'info');
    }

    /**
     * Обновление временного полигона
     */
    updateTempPolygon() {
        // Удаляем старый временный полигон
        if (this.tempPolygon) {
            this.mapCore.map.removeLayer(this.tempPolygon);
        }
        
        // Если есть хотя бы 3 точки, создаем полигон
        if (this.polygonPoints.length >= 3) {
            const color = document.getElementById('room-color').value || '#3498db';
            
            // Для отображения временного полигона не замыкаем его
            let pointsToShow = this.polygonPoints;
            
            this.tempPolygon = L.polygon(pointsToShow, {
                color: color,
                weight: 2,
                fillColor: color,
                fillOpacity: 0.3,
                dashArray: '5, 5'
            }).addTo(this.mapCore.map);
            
            // Добавляем popup с инструкцией
            this.tempPolygon.bindPopup(`
                <div style="padding: 10px;">
                    <strong>Полигон (${this.polygonPoints.length} вершин)</strong><br>
                    <small>Двойной клик или клик на первую точку для завершения</small>
                </div>
            `);
        }
    }

    /**
     * Завершение рисования полигона
     */
    finishDrawing() {
        if (this.polygonPoints.length < 3) {
            Utils.showNotification('Полигон должен иметь минимум 3 вершины', 'error');
            return;
        }
        
        console.log('Завершение рисования полигона с', this.polygonPoints.length, 'вершинами');
        
        this.isDrawing = false;
        
        // Отключаем перетаскивание маркеров
        this.tempMarkers.forEach(marker => {
            if (marker.dragging) {
                marker.dragging.disable();
            }
        });
        
        // Обновляем UI
        const drawBtn = document.getElementById('draw-polygon-btn');
        if (drawBtn) {
            drawBtn.classList.remove('active');
        }
        
        // Скрываем кнопку завершения
        const finishBtn = document.getElementById('finish-drawing-btn');
        if (finishBtn) {
            finishBtn.style.display = 'none';
        }
        
        // Удаляем обработчики
        this.removeDrawingHandlers();
        
        // Обновляем временный полигон на окончательный вид (замкнутый)
        if (this.tempPolygon) {
            // Создаем замыкающий полигон
            const closedPoints = this.getClosedPolygonPoints();
            
            const color = document.getElementById('room-color').value || '#3498db';
            
            // Удаляем старый временный полигон
            this.mapCore.map.removeLayer(this.tempPolygon);
            
            // Создаем новый закрытый полигон
            this.tempPolygon = L.polygon(closedPoints, {
                color: color,
                weight: 2,
                fillColor: color,
                fillOpacity: 0.3,
                dashArray: null
            }).addTo(this.mapCore.map);
        }
        
        // Восстанавливаем оригинальный режим карты
        this.mapCore.setEditMode(this.originalMode);
        
        // Обновляем состояние кнопки сохранения
        this.updateSaveButtonState();
        
        // Показываем площадь полигона
        if (this.polygonPoints.length >= 3) {
            const area = Utils.calculatePolygonArea(this.getClosedPolygonPoints());
            Utils.showNotification(`Полигон создан! Вершин: ${this.polygonPoints.length}, Площадь: ${area.toFixed(0)} кв.ед.`, 'success');
        }
    }

    /**
     * Получение закрытого полигона (с замыканием на первую точку)
     * @returns {Array} Массив точек закрытого полигона
     */
    getClosedPolygonPoints() {
        if (this.polygonPoints.length < 3) return [...this.polygonPoints];
        
        const points = [...this.polygonPoints];
        const first = points[0];
        const last = points[points.length - 1];
        
        // Если последняя точка не совпадает с первой, добавляем первую точку в конец
        if (first[0] !== last[0] || first[1] !== last[1]) {
            points.push([...first]);
        }
        
        return points;
    }

    /**
     * Удаление обработчиков рисования
     */
    removeDrawingHandlers() {
        this.mapCore.map.off('click', this.handleMapClick);
        this.mapCore.map.off('dblclick', this.handleMapDblClick);
    }

    /**
     * Отмена рисования
     */
    cancelDrawing() {
        console.log('Отмена рисования полигона...');
        this.isDrawing = false;
        
        // Удаляем обработчики
        this.removeDrawingHandlers();
        
        // Очищаем временные слои
        this.clearTempLayers();
        
        // Сбрасываем состояние
        this.polygonPoints = [];
        this.currentPolygonId = null;
        
        // Скрываем кнопку завершения
        const finishBtn = document.getElementById('finish-drawing-btn');
        if (finishBtn) {
            finishBtn.style.display = 'none';
        }
        
        // Обновляем UI
        const drawBtn = document.getElementById('draw-polygon-btn');
        if (drawBtn) {
            drawBtn.classList.remove('active');
        }
        
        this.clearForm();
        
        // Восстанавливаем оригинальный режим
        if (this.originalMode !== null) {
            this.mapCore.setEditMode(this.originalMode);
            this.originalMode = null;
        } else {
            this.mapCore.setEditMode(null);
        }
        
        // Обновляем состояние кнопки сохранения
        this.updateSaveButtonState();
        
        Utils.showNotification('Рисование полигона отменено', 'info');
    }

    /**
     * Очистка временных слоев
     */
    clearTempLayers() {
        // Удаляем временный полигон
        if (this.tempPolygon) {
            this.mapCore.map.removeLayer(this.tempPolygon);
            this.tempPolygon = null;
        }
        
        // Удаляем маркеры вершин
        this.tempMarkers.forEach(marker => {
            if (marker && this.mapCore.map.hasLayer(marker)) {
                this.mapCore.map.removeLayer(marker);
            }
        });
        this.tempMarkers = [];
    }

    /**
     * Очистка формы
     */
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
        
        // Обновляем состояние кнопки сохранения
        this.updateSaveButtonState();
    }

    /**
     * Валидация формы
     * @returns {boolean} Валидна ли форма
     */
    validateForm() {
        return this.updateSaveButtonState();
    }

    /**
     * Сохранение полигона
     * @returns {object|null} Сохраненный полигон
     */
    async savePolygon() {
        console.log('Сохранение полигона... Текущее состояние:', {
            isDrawing: this.isDrawing,
            pointsLength: this.polygonPoints.length,
            currentPolygonId: this.currentPolygonId
        });
        
        // Если мы в процессе рисования, сначала завершаем его
        if (this.isDrawing) {
            console.log('Завершение рисования перед сохранением...');
            this.finishDrawing();
        }
        
        // Валидация формы
        if (!this.validateForm()) {
            console.error('Валидация формы не пройдена');
            
            if (this.polygonPoints.length < 3) {
                Utils.showNotification('Полигон должен иметь минимум 3 вершины', 'error');
            } else {
                Utils.showNotification('Введите название кабинета', 'error');
            }
            
            return null;
        }
        
        // Подготавливаем вершины
        const vertices = this.getClosedPolygonPoints();
        
        // Получаем данные из формы
        const polygonData = {
            name: document.getElementById('room-name').value.trim(),
            department: document.getElementById('room-dept').value.trim(),
            employees: document.getElementById('room-employees').value.trim(),
            phone: document.getElementById('room-phone').value.trim(),
            color: document.getElementById('room-color').value,
            vertices: vertices,
            area: Utils.calculatePolygonArea(vertices)
        };

        console.log('Сохранение данных полигона:', polygonData);

        try {
            let polygon;
            if (this.currentPolygonId) {
                // Редактирование существующего полигона
                console.log('Обновление существующего полигона:', this.currentPolygonId);
                polygon = this.dataManager.updatePolygon(this.currentPolygonId, polygonData);
                this.mapCore.updateRoom(this.currentPolygonId, polygon);
                Utils.showNotification('Кабинет обновлен', 'success');
            } else {
                // Создание нового полигона
                console.log('Создание нового полигона');
                
                // Проверяем dataManager перед сохранением
                console.log('DataManager перед добавлением:', this.dataManager);
                
                polygon = this.dataManager.addPolygon(polygonData);
                
                // Проверяем результат
                console.log('Полигон создан:', polygon);
                console.log('ID полигона:', polygon?.id);
                
                // Добавляем полигон на карту через mapCore
                if (polygon && polygon.id) {
                    this.mapCore.addRoom(polygon);
                    Utils.showNotification('Кабинет сохранен', 'success');
                } else {
                    throw new Error('Не удалось создать полигон: отсутствует ID');
                }
            }
            
            // Двойная проверка данных
            console.log('=== DEBUG СОХРАНЕНИЕ ПОЛИГОНА ===');
            console.log('1. DataManager instance:', this.dataManager);
            console.log('2. Все полигоны из dataManager:', this.dataManager.getAllPolygons());
            console.log('3. Количество:', this.dataManager.getAllPolygons().length);
            console.log('4. ID полигонов:', this.dataManager.getAllPolygons().map(p => p.id));
            console.log('=== КОНЕЦ DEBUG ===');
            
            // Обновляем список кабинетов
            this.renderPolygonsList();
            
            // Обновляем селекты в редакторе маршрутов (если он инициализирован)
            if (window.app && window.app.routesEditor) {
                window.app.routesEditor.populateSelects();
            }
            
            // Сбрасываем после сохранения
            this.resetAfterSave();
            
            return polygon;
            
        } catch (error) {
            console.error('Ошибка сохранения кабинета:', error);
            Utils.showNotification('Ошибка сохранения кабинета: ' + error.message, 'error');
            return null;
        }
    }

    /**
     * Сброс после сохранения
     */
    resetAfterSave() {
        console.log('Сброс после успешного сохранения');
        
        // Очищаем форму
        this.clearForm();
        
        // Очищаем временные слои
        this.clearTempLayers();
        
        // Сбрасываем точки
        this.polygonPoints = [];
        this.currentPolygonId = null;
        this.isDrawing = false;
        
        // Сбрасываем оригинальный режим
        this.originalMode = null;
        
        // Обновляем состояние кнопки сохранения
        this.updateSaveButtonState();
        
        // Обновляем UI кнопок
        const drawBtn = document.getElementById('draw-polygon-btn');
        if (drawBtn) {
            drawBtn.classList.remove('active');
        }
        
        const finishBtn = document.getElementById('finish-drawing-btn');
        if (finishBtn) {
            finishBtn.style.display = 'none';
        }
        
        console.log('Готов к созданию нового полигона');
    }

    /**
     * Рендеринг списка кабинетов
     */
    renderPolygonsList() {
        console.log('=== НАЧАЛО РЕНДЕРИНГА СПИСКА КАБИНЕТОВ ===');
        
        try {
            const polygons = this.dataManager.getAllPolygons();
            console.log('Полигоны из dataManager:', polygons);
            console.log('Количество полигонов:', polygons.length);
            
            const container = document.getElementById('rooms-list');
            if (!container) {
                console.error('Контейнер #rooms-list не найден!');
                console.log('=== ОШИБКА РЕНДЕРИНГА СПИСКА КАБИНЕТОВ ===');
                return;
            }
            
            if (polygons.length === 0) {
                container.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: #666;">
                        <i class="fas fa-draw-polygon" style="font-size: 2em; margin-bottom: 10px; display: block;"></i>
                        Нет созданных кабинетов
                    </div>
                `;
                console.log('Рендер: Нет полигонов');
            } else {
                // Создаем HTML для каждого полигона
                const html = polygons.map(polygon => {
                    const isActive = this.currentPolygonId === polygon.id;
                    console.log('Рендер полигона:', polygon.id, polygon.name);
                    
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
                console.log('Рендер', polygons.length, 'полигонов');
                
                // Добавляем обработчики событий
                container.querySelectorAll('.object-item').forEach(item => {
                    const polygonId = item.dataset.id;
                    
                    item.addEventListener('click', (e) => {
                        if (!e.target.closest('.btn-icon')) {
                            this.selectPolygon(polygonId);
                        }
                    });
                    
                    // Редактирование
                    const editBtn = item.querySelector('.edit-polygon');
                    if (editBtn) {
                        editBtn.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            this.editPolygon(polygonId);
                        });
                    }
                    
                    // Удаление
                    const deleteBtn = item.querySelector('.delete-polygon');
                    if (deleteBtn) {
                        deleteBtn.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            this.deletePolygon(polygonId);
                        });
                    }
                });
            }
            
            console.log('=== ЗАВЕРШЕНИЕ РЕНДЕРИНГА СПИСКА КАБИНЕТОВ ===');
            
        } catch (error) {
            console.error('Ошибка рендеринга списка кабинетов:', error);
            console.log('=== ОШИБКА РЕНДЕРИНГА СПИСКА КАБИНЕТОВ ===');
        }
    }

    /**
     * Выбор кабинета
     * @param {string} polygonId - ID кабинета
     */
    selectPolygon(polygonId) {
        const polygon = this.dataManager.getPolygon(polygonId);
        if (!polygon) return;

        console.log('Выбор кабинета:', polygonId);
        
        // Подсвечиваем полигон на карте
        this.mapCore.highlightRoom(polygonId);

        // Обновляем UI
        this.currentPolygonId = polygonId;
        this.renderPolygonsList();
        
        // Переключаемся на вкладку кабинетов
        const roomsTab = document.querySelector('[data-tab="rooms"]');
        if (roomsTab && !roomsTab.classList.contains('active')) {
            roomsTab.click();
        }
    }

    /**
     * Редактирование кабинета
     * @param {string} polygonId - ID кабинета
     */
    editPolygon(polygonId) {
        const polygon = this.dataManager.getPolygon(polygonId);
        if (!polygon) return;

        console.log('Редактирование кабинета:', polygonId);
        
        // Сначала очищаем текущее состояние
        this.cancelDrawing();
        
        // Заполняем форму
        document.getElementById('room-name').value = polygon.name;
        document.getElementById('room-dept').value = polygon.department || '';
        document.getElementById('room-employees').value = polygon.employees || '';
        document.getElementById('room-phone').value = polygon.phone || '';
        document.getElementById('room-color').value = polygon.color || '#3498db';
        document.getElementById('room-color-text').value = polygon.color || '#3498db';

        // Загружаем вершины полигона (убираем дубликат замыкания если есть)
        let vertices = [...polygon.vertices];
        if (vertices.length > 0) {
            const first = vertices[0];
            const last = vertices[vertices.length - 1];
            
            // Если последняя точка совпадает с первой, убираем дубликат для редактирования
            if (first[0] === last[0] && first[1] === last[1] && vertices.length > 3) {
                vertices.pop();
            }
        }
        
        this.polygonPoints = vertices;
        this.currentPolygonId = polygonId;
        
        // Начинаем режим редактирования
        this.startDrawing();
        
        // Загружаем существующие вершины
        if (this.polygonPoints.length >= 3) {
            // Создаем маркеры вершин
            this.tempMarkers = [];
            this.polygonPoints.forEach((point, index) => {
                this.addVertexMarker(point, index);
            });
            
            // Создаем временный полигон
            const color = polygon.color || '#3498db';
            this.tempPolygon = L.polygon(this.polygonPoints, {
                color: color,
                weight: 2,
                fillColor: color,
                fillOpacity: 0.3,
                dashArray: '5, 5'
            }).addTo(this.mapCore.map);
            
            // Завершаем рисование (чтобы можно было сразу сохранять)
            this.finishDrawing();
        }

        // Переключаемся на вкладку кабинетов
        document.querySelectorAll('.tab').forEach(tab => {
            if (tab.dataset.tab === 'rooms') {
                tab.click();
            }
        });

        Utils.showNotification(`Редактирование кабинета "${polygon.name}"`, 'info');
    }

    /**
     * Удаление кабинета
     * @param {string} polygonId - ID кабинета
     * @returns {Promise<boolean>} Успешно ли удалено
     */
    async deletePolygon(polygonId) {
        const polygon = this.dataManager.getPolygon(polygonId);
        if (!polygon) return false;

        console.log('Удаление кабинета:', polygonId);
        
        const confirmed = await Utils.showModal(
            'Удаление кабинета',
            `Вы уверены, что хотите удалить кабинет "${polygon.name}"?`
        );

        if (confirmed) {
            // Удаляем из dataManager
            const success = this.dataManager.deletePolygon(polygonId);
            
            if (success) {
                // Удаляем с карты
                this.mapCore.removeRoom(polygonId);
                
                // Обновляем список
                this.renderPolygonsList();
                
                if (this.currentPolygonId === polygonId) {
                    this.cancelDrawing();
                }
                
                // Обновляем селекты в редакторе маршрутов
                if (window.app && window.app.routesEditor) {
                    window.app.routesEditor.populateSelects();
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

    /**
     * Сброс всех кабинетов
     * @returns {boolean} Успешно ли сброшено
     */
    resetAllPolygons() {
        // Удаляем из dataManager
        this.dataManager.clearRooms();
        
        // Очищаем карту
        this.mapCore.clearAllLayers();
        
        // Обновляем UI
        this.renderPolygonsList();
        this.cancelDrawing();
        
        // Обновляем селекты в редакторе маршрутов
        if (window.app && window.app.routesEditor) {
            window.app.routesEditor.populateSelects();
        }
        
        // Обновляем статистику в главном приложении
        if (window.app) {
            window.app.updateStats();
        }
        
        Utils.showNotification('Все кабинеты удалены', 'success');
        return true;
    }

    /**
     * Получение текущего полигона
     * @returns {object|null} Текущий полигон
     */
    getCurrentPolygon() {
        if (this.currentPolygonId) {
            return this.dataManager.getPolygon(this.currentPolygonId);
        }
        return null;
    }

    /**
     * Проверка, находится ли точка в редактируемом полигоне
     * @param {number} y - Координата Y
     * @param {number} x - Координата X
     * @returns {boolean} Находится ли точка в полигоне
     */
    isPointInCurrentPolygon(y, x) {
        if (!this.currentPolygonId || this.polygonPoints.length < 3) {
            return false;
        }
        
        return Utils.isPointInPolygon([y, x], this.getClosedPolygonPoints());
    }
}

// Экспортируем класс для глобального использования
window.PolygonsEditor = PolygonsEditor;
