// main.js - Исправленная версия с кнопкой обновления карты

document.addEventListener('DOMContentLoaded', function() {
    console.log('Загрузка редактора карты офиса...');
    
    // Проверяем наличие Leaflet
    if (typeof L === 'undefined') {
        alert('Ошибка: Leaflet не загружен!');
        return;
    }
    
    // Ждем загрузки всех скриптов
    setTimeout(() => {
        checkAndInitApplication();
    }, 500);
});

function checkAndInitApplication() {
    console.log('Проверка загрузки классов...');
    
    // Проверяем наличие всех необходимых классов
    const classesToCheck = [
        { name: 'Utils', file: 'js/core/utils.js' },
        { name: 'MapCore', file: 'js/core/map-core.js' },
        { name: 'DataManager', file: 'js/core/data-manager.js' },
        { name: 'PolygonsEditor', file: 'js/editors/polygons.js' },
        { name: 'RoutingEditor', file: 'js/editors/routing-editor.js' },
        { name: 'WebExporter', file: 'js/export/web-exporter.js' },
        { name: 'MobileExporter', file: 'js/export/mobile-exporter.js' }
    ];
    
    const missingClasses = [];
    const loadedClasses = [];
    
    classesToCheck.forEach(item => {
        if (typeof window[item.name] === 'undefined') {
            missingClasses.push(`${item.name} (${item.file})`);
        } else {
            loadedClasses.push(item.name);
        }
    });
    
    console.log('Загруженные классы:', loadedClasses);
    console.log('Отсутствующие классы:', missingClasses);
    
    if (missingClasses.length > 0) {
        console.error('Не все классы загружены!');
        
        // Ждем еще и пробуем снова
        setTimeout(() => {
            checkAndInitApplication();
        }, 1000);
        return;
    }
    
    console.log('Все классы загружены, инициализация приложения...');
    initApplication();
}

async function initApplication() {
    console.log('Инициализация приложения...');
    
    try {
        // Создаем экземпляры основных классов
        console.log('Создание DataManager...');
        const dataManager = new DataManager();
        
        console.log('Создание MapCore...');
        const mapCore = new MapCore();
        
        // ИНИЦИАЛИЗИРУЕМ КАРТУ ПЕРЕД СОЗДАНИЕМ РЕДАКТОРОВ
        console.log('Инициализация карты...');
        try {
            // Получаем сохраненный путь к изображению
            const savedImagePath = dataManager.getImagePath ? dataManager.getImagePath() : 'img/plan.png';
            console.log('Загружен путь к изображению из данных:', savedImagePath);
            
            // Инициализируем карту
            await mapCore.init('map', savedImagePath);
            console.log('Карта успешно инициализирована');
        } catch (mapError) {
            console.error('Ошибка инициализации карты:', mapError);
            // Создаем пустую карту для разработки
            console.log('Создание резервной карты...');
            mapCore.map = L.map('map', {
                crs: L.CRS.Simple,
                minZoom: -2,
                maxZoom: 2
            });
            mapCore.map.setView([0, 0], 0);
            console.log('Резервная карта создана');
        }
        
        console.log('Создание PolygonsEditor...');
        const polygonsEditor = new PolygonsEditor(mapCore, dataManager);
        
        console.log('Создание RoutingEditor...');
        const routingEditor = new RoutingEditor(mapCore, dataManager);
        
        // ===== НОВЫЙ КОД: Создание импортера =====
        console.log('Создание MapImporter...');
        const mapImporter = new MapImporter(dataManager, mapCore);
        
        // Сохраняем глобальные ссылки
        window.app = {
            dataManager: dataManager,
            mapCore: mapCore,
            polygonsEditor: polygonsEditor,
            routingEditor: routingEditor,
            mapImporter: mapImporter  // Добавляем импортер
        };
        
        // Данные уже загружены в конструкторе DataManager
        console.log('Данные уже загружены конструктором DataManager');
        
        // Инициализируем UI
        initUI(dataManager, mapCore, polygonsEditor, routingEditor);
        
        // Обновляем статистику
        updateStats(dataManager);
        
        // Отображаем загруженные объекты
        displayLoadedObjects(dataManager, mapCore, polygonsEditor, routingEditor);
        
        console.log('Редактор карты успешно загружен!');
        showNotification('Редактор загружен. Готов к работе.', 'success');
        updateStatus('Готов к работе');
        
    } catch (error) {
        console.error('Ошибка инициализации приложения:', error);
        showNotification('Ошибка инициализации: ' + error.message, 'error');
    }
}

function initUI(dataManager, mapCore, polygonsEditor, routingEditor) {
    console.log('Инициализация UI...');
    
    // Инициализация вкладок
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            const tabContent = document.getElementById(tabId + '-tab');
            if (tabContent) tabContent.classList.add('active');
        });
    });
    
    // Инициализация панели кабинетов
    initRoomsUI(dataManager, polygonsEditor);
    
    // Инициализация панели маршрутов
    initRoutesUI(dataManager, routingEditor);
    
    // Инициализация панели экспорта
    initExportUI(dataManager, mapCore);
    
    // Координаты на карте
    if (mapCore && mapCore.map) {
        mapCore.map.on('mousemove', function(e) {
            const coordsDisplay = document.getElementById('coords-display');
            if (coordsDisplay) {
                coordsDisplay.textContent = `Координаты: y=${e.latlng.lat.toFixed(1)}, x=${e.latlng.lng.toFixed(1)}`;
            }
        });
    }
    
    console.log('UI инициализирован');
}

function initRoomsUI(dataManager, polygonsEditor) {
    console.log('Инициализация UI кабинетов...');
    
    const drawBtn = document.getElementById('draw-polygon-btn');
    if (drawBtn) {
        drawBtn.addEventListener('click', function() {
            console.log('Кнопка рисования полигона нажата');
            if (polygonsEditor && polygonsEditor.startDrawing) {
                polygonsEditor.startDrawing();
            }
        });
    }
    
    const saveBtn = document.getElementById('save-room-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            console.log('Кнопка сохранения нажата');
            if (polygonsEditor && polygonsEditor.savePolygon) {
                polygonsEditor.savePolygon();
            }
        });
    }
    
    const resetBtn = document.getElementById('reset-rooms-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            console.log('Кнопка сброса нажата');
            if (polygonsEditor && polygonsEditor.resetAllPolygons) {
                polygonsEditor.resetAllPolygons();
            }
        });
    }
    
    console.log('UI кабинетов инициализирован');
}

function initRoutesUI(dataManager, routingEditor) {
    console.log('Инициализация UI маршрутов...');
    
    const createPointBtn = document.getElementById('create-point-btn');
    if (createPointBtn) {
        createPointBtn.addEventListener('click', function() {
            console.log('Кнопка создания точки нажата');
            const name = document.getElementById('point-name-input').value;
            if (routingEditor && routingEditor.startPointCreation) {
                routingEditor.startPointCreation({
                    name: name,
                    type: document.getElementById('point-type-select').value,
                    useInRouting: document.getElementById('point-routing-checkbox').checked
                });
            }
        });
    }
    
    console.log('UI маршрутов инициализирован');
}

function initExportUI(dataManager, mapCore) {
    console.log('Инициализация UI экспорта...');
    
    // Инициализация загрузчика изображений
    initImageLoader(mapCore, dataManager);
    
    // Обработчик экспорта веб-интерфейса
    const exportBtn = document.getElementById('export-web-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            if (typeof WebExporter !== 'undefined') {
                const exporter = new WebExporter(dataManager);
                const options = {
                    title: document.getElementById('webmap-title').value,
                    description: document.getElementById('webmap-description').value,
                    theme: document.getElementById('webmap-theme').value
                };
                exporter.exportWebInterface(options);
            }
        });
    }
    
    // Обработчик для мобильного экспорта
    const exportMobileBtn = document.getElementById('export-mobile-btn');
    if (exportMobileBtn) {
        exportMobileBtn.addEventListener('click', function() {
            if (typeof MobileExporter !== 'undefined') {
                const exporter = new MobileExporter(dataManager);
                const options = {
                    title: document.getElementById('webmap-title').value || 'Мобильная карта офиса',
                    description: document.getElementById('webmap-description').value || 'Навигация по офису на мобильных устройствах'
                };
                const success = exporter.exportMobileInterface(options);
                
                if (success) {
                    showNotification('Мобильная версия успешно экспортирована!', 'success');
                } else {
                    showNotification('Ошибка при экспорте мобильной версии', 'error');
                }
            } else {
                showNotification('MobileExporter не загружен', 'error');
            }
        });
    }
    
    // Функция предпросмотра веб-интерфейса (исправленная)
	const previewBtn = document.getElementById('preview-web-btn');
	if (previewBtn) {
		previewBtn.addEventListener('click', function() {
			console.log('Предпросмотр веб-интерфейса');
			
			if (typeof WebExporter === 'undefined') {
				alert('Ошибка: WebExporter не загружен');
				return;
			}
			
			try {
				// Создаем временный экспортер
				const exporter = new WebExporter(dataManager);
				const options = {
					title: document.getElementById('webmap-title')?.value || 'Интерактивная карта офиса',
					description: document.getElementById('webmap-description')?.value || '',
					theme: document.getElementById('webmap-theme')?.value || 'light'
				};
				
				// Генерируем HTML
				let html;
				if (typeof exporter.generateWebHTML === 'function') {
					html = exporter.generateWebHTML(options);
				} else if (typeof exporter.generateHTML === 'function') {
					html = exporter.generateHTML(options);
				} else {
					console.warn('Метод generateHTML не найден, используем exportWebInterface');
					
					// Получаем Blob из exportWebInterface
					const blob = exporter.exportWebInterface(options);
					if (blob instanceof Blob) {
						const url = URL.createObjectURL(blob);
						
						// ИСПРАВЛЕНИЕ: Создаем iframe для безопасной загрузки
						const previewWindow = window.open('about:blank', '_blank');
						if (previewWindow) {
							previewWindow.document.write(`
								<!DOCTYPE html>
								<html>
								<head>
									<title>Загрузка карты...</title>
									<style>
										body { 
											margin: 0; 
											padding: 20px; 
											font-family: sans-serif;
											background: #f5f5f5;
											display: flex;
											align-items: center;
											justify-content: center;
											height: 100vh;
										}
										.loader {
											text-align: center;
											color: #666;
										}
										.spinner {
											border: 4px solid #f3f3f3;
											border-top: 4px solid #3498db;
											border-radius: 50%;
											width: 40px;
											height: 40px;
											animation: spin 1s linear infinite;
											margin: 20px auto;
										}
										@keyframes spin {
											0% { transform: rotate(0deg); }
											100% { transform: rotate(360deg); }
										}
									</style>
								</head>
								<body>
									<div class="loader">
										<div class="spinner"></div>
										<p>Загрузка интерактивной карты...</p>
									</div>
									<script>
										// Загружаем сгенерированный HTML через fetch
										fetch('${url}')
											.then(response => response.text())
											.then(html => {
												document.open();
												document.write(html);
												document.close();
												URL.revokeObjectURL('${url}');
											})
											.catch(error => {
												document.body.innerHTML = '<h1>Ошибка загрузки</h1><p>' + error + '</p>';
											});
									<\/script>
								</body>
								</html>
							`);
							previewWindow.document.close();
						}
						
						return;
					} else {
						alert('Метод предпросмотра не поддерживается');
						return;
					}
				}
				
				// ИСПРАВЛЕНИЕ: Используем blob URL для безопасной загрузки
				const blob = new Blob([html], { type: 'text/html' });
				const url = URL.createObjectURL(blob);
				
				// Открываем в новом окне через временный iframe
				const previewWindow = window.open('about:blank', '_blank');
				if (previewWindow) {
					previewWindow.document.write(`
						<!DOCTYPE html>
						<html>
						<head>
							<title>Загрузка карты...</title>
							<style>
								body { 
									margin: 0; 
									padding: 20px; 
									font-family: sans-serif;
									background: #f5f5f5;
									display: flex;
									align-items: center;
									justify-content: center;
									height: 100vh;
								}
								.loader {
									text-align: center;
									color: #666;
								}
								.spinner {
									border: 4px solid #f3f3f3;
									border-top: 4px solid #3498db;
									border-radius: 50%;
									width: 40px;
									height: 40px;
									animation: spin 1s linear infinite;
									margin: 20px auto;
								}
								@keyframes spin {
									0% { transform: rotate(0deg); }
									100% { transform: rotate(360deg); }
								}
							</style>
						</head>
						<body>
							<div class="loader">
								<div class="spinner"></div>
								<p>Загрузка интерактивной карты...</p>
							</div>
							<script>
								// Перенаправляем на blob URL
								window.location.href = '${url}';
							<\/script>
						</body>
						</html>
					`);
					previewWindow.document.close();
				}
				
				// Очищаем URL через некоторое время
				setTimeout(() => {
					URL.revokeObjectURL(url);
				}, 10000);
				
				showNotification('Предпросмотр открыт в новом окне', 'success');
				
			} catch (error) {
				console.error('Ошибка предпросмотра:', error);
				alert('Ошибка при создании предпросмотра: ' + error.message);
			}
		});
		console.log('✓ Исправленный обработчик предпросмотра добавлен');
	}
    
    // ===== НОВЫЙ КОД: Кнопка тестирования маршрута =====
    const testRouteBtn = document.getElementById('test-route-btn');
    if (testRouteBtn) {
        testRouteBtn.addEventListener('click', function() {
            console.log('Тестирование случайного маршрута');
            
            const routingEditor = window.app?.routingEditor;
            if (!routingEditor) {
                alert('Ошибка: редактор маршрутов не найден');
                return;
            }
            
            try {
                // Получаем все точки для маршрутизации
                const routingPoints = dataManager.getRoutingPoints();
                
                if (routingPoints.length < 2) {
                    alert('Недостаточно точек для тестирования маршрута (нужно минимум 2)');
                    return;
                }
                
                // Выбираем две случайные разные точки
                let startIndex = Math.floor(Math.random() * routingPoints.length);
                let endIndex;
                do {
                    endIndex = Math.floor(Math.random() * routingPoints.length);
                } while (endIndex === startIndex);
                
                const startPoint = routingPoints[startIndex];
                const endPoint = routingPoints[endIndex];
                
                console.log('Тестируем маршрут:', startPoint.name, '->', endPoint.name);
                
                // Устанавливаем значения в селекты
                const startSelect = document.getElementById('test-start-select');
                const endSelect = document.getElementById('test-end-select');
                
                if (startSelect && endSelect) {
                    startSelect.value = startPoint.id;
                    endSelect.value = endPoint.id;
                    
                    // Обновляем кнопку поиска
                    if (routingEditor.updateFindRouteButton) {
                        routingEditor.updateFindRouteButton();
                    }
                    
                    // Запускаем поиск маршрута
                    if (routingEditor.testRoute) {
                        routingEditor.testRoute();
                    } else {
                        // Если нет testRoute, используем альтернативный метод
                        console.warn('Метод testRoute не найден, ищем альтернативы');
                        
                        // Пробуем найти путь напрямую
                        if (routingEditor.findPathBFS) {
                            const result = routingEditor.findPathBFS(startPoint.id, endPoint.id);
                            if (result && result.success) {
                                if (routingEditor.showRoute) {
                                    routingEditor.showRoute(result.path);
                                }
                                if (routingEditor.showRouteInfo) {
                                    routingEditor.showRouteInfo(result);
                                } else {
                                    alert(`Маршрут найден! Длина: ${result.length.toFixed(1)} ед.`);
                                }
                            } else {
                                alert('Путь не найден между выбранными точками');
                            }
                        } else {
                            alert('Функция поиска маршрута не доступна');
                        }
                    }
                    
                    showNotification(`Тестирование маршрута: ${startPoint.name} → ${endPoint.name}`, 'info');
                }
                
            } catch (error) {
                console.error('Ошибка тестирования:', error);
                alert('Ошибка при тестировании маршрута: ' + error.message);
            }
        });
        console.log('✓ Обработчик тестирования добавлен в main.js');
    }
    
    console.log('UI экспорта инициализирован');
}

// Функция инициализации загрузчика изображений
function initImageLoader(mapCore, dataManager) {
    console.log('Инициализация загрузчика изображений...');
    
    // Обновляем отображение текущего пути
    updateCurrentPlanPath(mapCore);
    
    // Обработчик кнопки обновления карты
    const refreshBtn = document.getElementById('refresh-map-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            refreshMapImage(mapCore, dataManager);
        });
    }
    
    // Обработчик загрузки файла
    const fileInput = document.getElementById('plan-image-upload');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            // Проверяем тип файла
            if (!file.type.startsWith('image/')) {
                showNotification('Пожалуйста, выберите файл изображения', 'error');
                return;
            }
            
            // Создаем URL для загруженного файла
            const imageUrl = URL.createObjectURL(file);
            
            // Обновляем поле пути
            const pathInput = document.getElementById('plan-image-path');
            if (pathInput) {
                pathInput.value = imageUrl;
            }
            
            // Меняем изображение на карте
            changeMapImage(mapCore, dataManager, imageUrl);
        });
    }
    
    // Обработчик кнопки смены изображения по пути
    const changeBtn = document.getElementById('change-plan-btn');
    if (changeBtn) {
        changeBtn.addEventListener('click', function() {
            const pathInput = document.getElementById('plan-image-path');
            if (!pathInput) return;
            
            const imagePath = pathInput.value.trim();
            if (!imagePath) {
                showNotification('Укажите путь к изображению', 'warning');
                return;
            }
            
            changeMapImage(mapCore, dataManager, imagePath);
        });
    }
    
    // Обработчик Enter в поле пути
    const pathInput = document.getElementById('plan-image-path');
    if (pathInput) {
        pathInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const imagePath = this.value.trim();
                if (imagePath) {
                    changeMapImage(mapCore, dataManager, imagePath);
                }
            }
        });
    }
}

// Функция принудительного обновления изображения
function refreshMapImage(mapCore, dataManager) {
    if (!mapCore || !mapCore.map) {
        showNotification('Карта не инициализирована', 'error');
        return;
    }
    
    const currentPath = mapCore.currentImagePath || 'img/plan.png';
    
    console.log('Принудительное обновление изображения:', currentPath);
    showNotification('Обновление изображения...', 'info');
    
    // Генерируем уникальный параметр для обхода кеша
    const cacheBuster = '?refresh=' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const newUrl = currentPath + cacheBuster;
    
    try {
        // Сохраняем текущий зум и центр
        const center = mapCore.map.getCenter();
        const zoom = mapCore.map.getZoom();
        
        // Удаляем старое изображение
        if (mapCore.imageOverlay) {
            mapCore.map.removeLayer(mapCore.imageOverlay);
        }
        
        // Создаем новое изображение
        mapCore.imageOverlay = L.imageOverlay(newUrl, mapCore.imageBounds, {
            opacity: 1
        }).addTo(mapCore.map);
        
        // Восстанавливаем позицию карты
        mapCore.map.setView(center, zoom);
        
        // Сохраняем путь в данных (без параметра)
        if (dataManager && dataManager.saveImagePath) {
            dataManager.saveImagePath(currentPath);
        }
        
        // Обновляем отображение пути
        updateCurrentPlanPath(mapCore);
        
        showNotification('Изображение обновлено!', 'success');
        console.log('✅ Изображение успешно обновлено');
        
    } catch (error) {
        console.error('Ошибка при обновлении изображения:', error);
        showNotification('Ошибка при обновлении изображения', 'error');
    }
}

// Функция смены изображения на карте
function changeMapImage(mapCore, dataManager, imagePath) {
    if (!mapCore || !mapCore.map) {
        showNotification('Карта не инициализирована', 'error');
        return;
    }
    
    // Показываем индикатор загрузки
    showNotification('Загрузка изображения...', 'info');
    
    // Генерируем уникальный параметр для обхода кеша
    const cacheBuster = '?v=' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const imageUrl = imagePath + cacheBuster;
    
    // Проверяем существование файла через создание временного Image объекта
    const img = new Image();
    img.onload = function() {
        try {
            // Сохраняем текущий зум и центр
            const center = mapCore.map.getCenter();
            const zoom = mapCore.map.getZoom();
            
            // Удаляем старое изображение
            if (mapCore.imageOverlay) {
                mapCore.map.removeLayer(mapCore.imageOverlay);
            }
            
            // Добавляем новое изображение
            mapCore.imageOverlay = L.imageOverlay(imageUrl, mapCore.imageBounds, {
                opacity: 1
            }).addTo(mapCore.map);
            
            // Восстанавливаем позицию карты
            mapCore.map.setView(center, zoom);
            
            // Сохраняем новый путь (без параметра)
            mapCore.currentImagePath = imagePath;
            if (dataManager && dataManager.saveImagePath) {
                dataManager.saveImagePath(imagePath);
            }
            
            // Обновляем отображение текущего пути
            updateCurrentPlanPath(mapCore);
            
            // Очищаем input file
            const fileInput = document.getElementById('plan-image-upload');
            if (fileInput) fileInput.value = '';
            
            showNotification('Изображение успешно обновлено', 'success');
            
        } catch (error) {
            console.error('Ошибка при смене изображения:', error);
            showNotification('Ошибка при обновлении изображения', 'error');
        }
    };
    
    img.onerror = function() {
        console.error('Ошибка загрузки изображения:', imagePath);
        showNotification('Не удалось загрузить изображение: ' + imagePath, 'error');
    };
    
    img.src = imageUrl;
}

// Функция обновления отображения текущего пути изображения
function updateCurrentPlanPath(mapCore) {
    const pathSpan = document.getElementById('current-plan-path');
    if (!pathSpan) return;
    
    let currentPath = 'img/plan.png';
    if (mapCore && mapCore.currentImagePath) {
        currentPath = mapCore.currentImagePath;
    }
    
    pathSpan.textContent = currentPath;
    
    // Обновляем поле ввода, если оно есть
    const pathInput = document.getElementById('plan-image-path');
    if (pathInput && pathInput.value !== currentPath) {
        pathInput.value = currentPath;
    }
}

function displayLoadedObjects(dataManager, mapCore, polygonsEditor, routingEditor) {
    console.log('Отображение загруженных объектов...');
    
    // Загружаем кабинеты на карту через polygonsEditor
    if (polygonsEditor && polygonsEditor.loadPolygonsToMap) {
        polygonsEditor.loadPolygonsToMap();
    }
    
    // Загружаем точки и соединения через routingEditor
    if (routingEditor && routingEditor.updatePointsDisplay && routingEditor.updateConnectionsDisplay) {
        routingEditor.updatePointsDisplay();
        routingEditor.updateConnectionsDisplay();
    }
    
    console.log('Объекты загружены на карту');
}

function updateStats(dataManager) {
    console.log('Обновление статистики...');
    
    try {
        // Получаем данные через правильные методы DataManager
        const rooms = dataManager.getAllPolygons ? dataManager.getAllPolygons() : [];
        const points = dataManager.getAllPoints ? dataManager.getAllPoints() : [];
        const connections = dataManager.getAllConnections ? dataManager.getAllConnections() : [];
        
        console.log('Статистика:', {
            rooms: rooms.length,
            points: points.length,
            connections: connections.length
        });
        
        // Обновляем элементы статистики
        const statsRooms = document.getElementById('stats-rooms');
        const statsPoints = document.getElementById('stats-points');
        const statsConnections = document.getElementById('stats-connections');
        const statsTotal = document.getElementById('stats-total');
        
        if (statsRooms) statsRooms.textContent = rooms.length;
        if (statsPoints) statsPoints.textContent = points.length;
        if (statsConnections) statsConnections.textContent = connections.length;
        if (statsTotal) statsTotal.textContent = rooms.length + points.length + connections.length;
        
    } catch (error) {
        console.error('Ошибка обновления статистики:', error);
    }
}

function updateStatus(message) {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

function showNotification(message, type = 'info') {
    console.log(`${type}: ${message}`);
    
    if (typeof Utils !== 'undefined' && Utils.showNotification) {
        Utils.showNotification(message, type);
    } else {
        // Простая версия
        alert(message);
    }
}

// Функции для отладки
window.debugApp = function() {
    console.log('=== Отладка приложения ===');
    console.log('1. window.app:', window.app);
    console.log('2. Загруженные классы:');
    
    const classes = [
        'Utils',
        'MapCore', 
        'DataManager',
        'PolygonsEditor',
        'RoutingEditor',
        'WebExporter',
        'MobileExporter'
    ];
    
    classes.forEach(cls => {
        const loaded = typeof window[cls] !== 'undefined';
        console.log(`   - ${cls}: ${loaded ? '✓' : '✗'}`);
    });
    
    if (window.app) {
        console.log('3. Компоненты приложения:');
        console.log('   - dataManager:', !!window.app.dataManager);
        console.log('   - mapCore:', !!window.app.mapCore);
        console.log('   - mapCore.map:', window.app.mapCore?.map ? '✓' : '✗');
        console.log('   - mapCore.currentImagePath:', window.app.mapCore?.currentImagePath);
        console.log('   - polygonsEditor:', !!window.app.polygonsEditor);
        console.log('   - routingEditor:', !!window.app.routingEditor);
        
        alert('✅ Приложение инициализировано\n\nПроверьте консоль для подробностей.');
    } else {
        alert('❌ Приложение НЕ инициализировано.\n\nПроверьте консоль на ошибки загрузки файлов.');
    }
};
