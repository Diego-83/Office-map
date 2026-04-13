/**
 * МЕНЕДЖЕР ИМПОРТА/ЭКСПОРТА КАРТ
 * Позволяет сохранять и загружать карты в разных форматах
 */

class MapImporter {
    constructor(dataManager, mapCore) {
        this.dataManager = dataManager;
        this.mapCore = mapCore;
        
        // Добавляем недостающие методы в dataManager если их нет
        this.ensureDataManagerMethods();
        
        this.initUI();
    }

    /**
     * Проверка и добавление недостающих методов в dataManager
     */
    ensureDataManagerMethods() {
        // Добавляем getImagePath если его нет
        if (!this.dataManager.getImagePath) {
            this.dataManager.getImagePath = function() {
                return this.data.imagePath || 'img/plan.png';
            };
            console.log('✅ Метод getImagePath добавлен в dataManager');
        }

        // Добавляем saveImagePath если его нет
        if (!this.dataManager.saveImagePath) {
            this.dataManager.saveImagePath = function(path) {
                this.data.imagePath = path;
                if (this.saveData) {
                    this.saveData();
                }
                console.log('✅ Метод saveImagePath добавлен в dataManager');
            };
        }

        // Добавляем clearPolygons если его нет
        if (!this.dataManager.clearPolygons && this.dataManager.clearRooms) {
            this.dataManager.clearPolygons = this.dataManager.clearRooms;
        }

        // Добавляем getAllPolygons если его нет
        if (!this.dataManager.getAllPolygons && this.dataManager.getRooms) {
            this.dataManager.getAllPolygons = this.dataManager.getRooms;
        }
    }

    /**
     * Инициализация UI для импорта/экспорта
     */
    initUI() {
        // Добавляем новую вкладку в панель управления
        this.addImportExportTab();
        
        // Добавляем кнопки быстрого действия
        this.addQuickButtons();
    }

    /**
     * Добавление вкладки импорта/экспорта (ИСПРАВЛЕННАЯ ВЕРСИЯ)
     */
    addImportExportTab() {
        console.log('Добавление вкладки импорта/экспорта (исправленная версия)');
        
        const tabsContainer = document.querySelector('.tabs');
        if (!tabsContainer) {
            console.error('Контейнер вкладок не найден');
            return;
        }

        // Проверяем, существует ли вкладка
        let tab = document.querySelector('.tab[data-tab="import-export"]');
        let tabContent = document.getElementById('import-export-tab');
        
        // Если вкладка существует, но контент пустой - обновляем контент
        if (tab && tabContent) {
            console.log('Вкладка существует, обновляем контент');
            tabContent.innerHTML = this.getImportExportHTML();
            
            // Добавляем обработчик для вкладки
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                tabContent.classList.add('active');
                
                this.updateMapInfo();
                this.updateBackupList();
            });
            
            // Инициализируем обработчики кнопок
            this.initImportExportHandlers();
            
            // Обновляем информацию
            this.updateMapInfo();
            this.updateBackupList();
            
            console.log('✅ Контент вкладки обновлен');
            return;
        }
        
        // Если вкладки нет - создаем новую
        console.log('Создание новой вкладки');
        
        // Добавляем новую вкладку
        tab = document.createElement('div');
        tab.className = 'tab';
        tab.setAttribute('data-tab', 'import-export');
        tab.innerHTML = '<i class="fas fa-exchange-alt"></i> Импорт/Экспорт';
        tabsContainer.appendChild(tab);

        // Создаем контент для вкладки
        tabContent = document.createElement('div');
        tabContent.className = 'tab-content';
        tabContent.id = 'import-export-tab';
        tabContent.innerHTML = this.getImportExportHTML();
        
        // Находим родительский контейнер для вкладок
        const activeTab = document.querySelector('.tab-content.active');
        const parentContainer = activeTab ? activeTab.parentNode : document.querySelector('.control-panel');
        
        if (!parentContainer) {
            console.error('Родительский контейнер не найден');
            return;
        }
        
        parentContainer.appendChild(tabContent);

        // Добавляем обработчик для вкладки
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            tabContent.classList.add('active');
            
            this.updateMapInfo();
            this.updateBackupList();
        });

        // Инициализируем обработчики кнопок
        this.initImportExportHandlers();
        
        // Обновляем информацию
        this.updateMapInfo();
        this.updateBackupList();
        
        console.log('✅ Вкладка импорта/экспорта создана');
    }

    /**
     * HTML для вкладки импорта/экспорта
     */
    getImportExportHTML() {
        return `
            <div class="section">
                <div class="section-header">
                    <i class="fas fa-download"></i> Экспорт карты
                </div>
                <div class="section-body">
                    <div class="form-group">
                        <label>Название карты:</label>
                        <input type="text" id="map-name" class="form-control" value="Моя карта офиса" placeholder="Введите название карты">
                    </div>
                    
                    <div class="form-group">
                        <label>Формат экспорта:</label>
                        <select id="export-format" class="form-control">
                            <option value="json">JSON (полные данные)</option>
                            <option value="compact">Компактный JSON</option>
                            <option value="backup">Резервная копия</option>
                        </select>
                    </div>

                    <div class="checkbox-group" style="margin-bottom: 15px;">
                        <label>
                            <input type="checkbox" id="export-rooms" checked> Кабинеты
                        </label>
                        <label>
                            <input type="checkbox" id="export-points" checked> Точки маршрутов
                        </label>
                        <label>
                            <input type="checkbox" id="export-connections" checked> Соединения
                        </label>
                        <label>
                            <input type="checkbox" id="export-image-path" checked> Путь к изображению
                        </label>
                    </div>

                    <div class="btn-group">
                        <button id="export-json-btn" class="btn btn-primary">
                            <i class="fas fa-file-code"></i> Экспорт в JSON
                        </button>
                        <button id="export-backup-btn" class="btn btn-info">
                            <i class="fas fa-archive"></i> Создать бэкап
                        </button>
                    </div>

                    <div class="info-box" style="margin-top: 15px;">
                        <i class="fas fa-info-circle"></i> JSON-файл можно сохранить и позже загрузить обратно
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-header">
                    <i class="fas fa-upload"></i> Импорт карты
                </div>
                <div class="section-body">
                    <div class="form-group">
                        <label>Загрузить файл карты:</label>
                        <input type="file" id="import-file" class="form-control" accept=".json,application/json">
                        <small class="warning-text">Поддерживаются файлы JSON (экспорт из редактора)</small>
                    </div>

                    <div class="form-group">
                        <label>Или вставьте JSON:</label>
                        <textarea id="import-json" class="form-control" rows="6" placeholder='{"rooms": [], "points": [], ...}'></textarea>
                    </div>

                    <div class="checkbox-group" style="margin-bottom: 15px;">
                        <label>
                            <input type="checkbox" id="import-merge"> Объединить с текущей картой (не удалять существующие)
                        </label>
                        <label>
                            <input type="checkbox" id="import-replace-image"> Заменить путь к изображению
                        </label>
                    </div>

                    <div class="btn-group">
                        <button id="import-file-btn" class="btn btn-success">
                            <i class="fas fa-file-import"></i> Импорт из файла
                        </button>
                        <button id="import-json-btn" class="btn btn-warning">
                            <i class="fas fa-paste"></i> Импорт из JSON
                        </button>
                    </div>

                    <div class="danger-text" style="margin-top: 10px;">
                        <i class="fas fa-exclamation-triangle"></i> Внимание! Импорт может заменить существующие данные
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-header">
                    <i class="fas fa-history"></i> Управление версиями
                </div>
                <div class="section-body">
                    <div class="form-group">
                        <label>Доступные бэкапы:</label>
                        <select id="backup-list" class="form-control" size="5">
                            <option value="">Нет сохраненных бэкапов</option>
                        </select>
                    </div>

                    <div class="btn-group">
                        <button id="restore-backup-btn" class="btn btn-info" disabled>
                            <i class="fas fa-undo"></i> Восстановить
                        </button>
                        <button id="delete-backup-btn" class="btn btn-danger" disabled>
                            <i class="fas fa-trash"></i> Удалить
                        </button>
                    </div>

                    <hr>

                    <div class="form-group">
                        <label>Быстрое сохранение:</label>
                        <div class="btn-group">
                            <button id="quick-save-btn" class="btn btn-primary">
                                <i class="fas fa-save"></i> Быстрое сохранение (F5)
                            </button>
                            <button id="quick-load-btn" class="btn btn-success">
                                <i class="fas fa-redo"></i> Быстрая загрузка (F9)
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-header">
                    <i class="fas fa-chart-bar"></i> Информация о карте
                </div>
                <div class="section-body">
                    <div id="map-info" class="info-box">
                        <div><strong>Кабинетов:</strong> <span id="info-rooms">0</span></div>
                        <div><strong>Точек:</strong> <span id="info-points">0</span></div>
                        <div><strong>Соединений:</strong> <span id="info-connections">0</span></div>
                        <div><strong>Размер JSON:</strong> <span id="info-size">0</span> KB</div>
                        <div><strong>Последнее сохранение:</strong> <span id="info-saved">никогда</span></div>
                    </div>
                    
                    <button id="refresh-info-btn" class="btn btn-info btn-block" style="margin-top: 10px;">
                        <i class="fas fa-sync-alt"></i> Обновить информацию
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Инициализация обработчиков (стабильная версия БЕЗ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ)
     */
    initImportExportHandlers() {
        console.log('Инициализация обработчиков импорта/экспорта');
        
        // Экспорт в JSON
        document.getElementById('export-json-btn')?.addEventListener('click', () => this.exportToJSON());
        
        // Создание бэкапа
        document.getElementById('export-backup-btn')?.addEventListener('click', () => this.createBackup());
        
        // Импорт из файла
        document.getElementById('import-file-btn')?.addEventListener('click', () => this.importFromFile());
        
        // Импорт из JSON
        document.getElementById('import-json-btn')?.addEventListener('click', () => this.importFromJSON());
        
        // Быстрое сохранение
        document.getElementById('quick-save-btn')?.addEventListener('click', () => this.quickSave());
        
        // Быстрая загрузка
        document.getElementById('quick-load-btn')?.addEventListener('click', () => this.quickLoad());
        
        // Обновление информации (ТОЛЬКО ПО КНОПКЕ)
        document.getElementById('refresh-info-btn')?.addEventListener('click', () => this.updateMapInfo());
        
        // Обработчики для бэкапов
        document.getElementById('restore-backup-btn')?.addEventListener('click', () => {
            const select = document.getElementById('backup-list');
            this.restoreBackup(select.value);
        });
        
        document.getElementById('delete-backup-btn')?.addEventListener('click', () => {
            const select = document.getElementById('backup-list');
            this.deleteBackup(select.value);
        });
        
        // Горячие клавиши
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F5') {
                e.preventDefault();
                this.quickSave();
            } else if (e.key === 'F9') {
                e.preventDefault();
                this.quickLoad();
            }
        });

        console.log('✅ Обработчики инициализированы (без автоматического обновления)');
    }

    /**
     * Добавление кнопок быстрого действия
     */
    addQuickButtons() {
        const statusBar = document.querySelector('.status-bar');
        if (!statusBar) return;

        // Проверяем, не добавлены ли уже кнопки
        if (statusBar.querySelector('.quick-save-btn')) {
            return;
        }

        const quickButtons = document.createElement('div');
        quickButtons.innerHTML = `
            <button class="quick-save-btn" title="Быстрое сохранение (F5)" style="
                background: none;
                border: none;
                color: #666;
                cursor: pointer;
                margin-right: 10px;
                font-size: 16px;
            ">
                <i class="fas fa-save"></i>
            </button>
            <button class="quick-load-btn" title="Быстрая загрузка (F9)" style="
                background: none;
                border: none;
                color: #666;
                cursor: pointer;
                font-size: 16px;
            ">
                <i class="fas fa-folder-open"></i>
            </button>
        `;

        quickButtons.querySelector('.quick-save-btn').addEventListener('click', () => this.quickSave());
        quickButtons.querySelector('.quick-load-btn').addEventListener('click', () => this.quickLoad());

        statusBar.appendChild(quickButtons);
    }

    /**
     * Экспорт в JSON
     */
    exportToJSON() {
        console.log('Экспорт в JSON...');
        
        const mapName = document.getElementById('map-name')?.value || 'map';
        const format = document.getElementById('export-format')?.value || 'json';
        
        // БЕЗОПАСНО получаем путь к изображению
        let imagePath = 'img/plan.png';
        try {
            if (this.dataManager.getImagePath && typeof this.dataManager.getImagePath === 'function') {
                imagePath = this.dataManager.getImagePath();
            } else if (this.dataManager.data && this.dataManager.data.imagePath) {
                imagePath = this.dataManager.data.imagePath;
            }
        } catch (e) {
            console.warn('Не удалось получить путь к изображению:', e);
        }
        
        // Собираем данные
        const data = {
            version: '2.0',
            name: mapName,
            date: new Date().toISOString(),
            rooms: document.getElementById('export-rooms')?.checked ? this.dataManager.getAllPolygons() : [],
            points: document.getElementById('export-points')?.checked ? this.dataManager.getAllPoints() : [],
            connections: document.getElementById('export-connections')?.checked ? this.dataManager.getAllConnections() : [],
            imagePath: imagePath,
            stats: this.getStats()
        };

        // Компактный формат
        if (format === 'compact') {
            data.rooms = data.rooms.map(r => ({
                id: r.id, 
                n: r.name, 
                v: r.vertices, 
                c: r.color,
                d: r.department, 
                e: r.employees, 
                p: r.phone
            }));
            data.points = data.points.map(p => ({
                id: p.id, 
                n: p.name, 
                y: p.y, 
                x: p.x, 
                t: p.type,
                r: p.isRouting, 
                c: p.color, 
                ri: p.roomId
            }));
            data.connections = data.connections.map(c => ({
                id: c.id, 
                f: c.from, 
                t: c.to, 
                l: c.length, 
                b: c.isBidirectional
            }));
        }

        // Создаем и скачиваем файл
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${mapName.replace(/[^a-zа-яё0-9]/gi, '_')}_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification(`Карта "${mapName}" экспортирована (${(json.length/1024).toFixed(1)} KB)`, 'success');
    }

    /**
     * Импорт из файла
     */
    importFromFile() {
        const fileInput = document.getElementById('import-file');
        if (!fileInput.files || fileInput.files.length === 0) {
            this.showNotification('Выберите файл для импорта', 'error');
            return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.processImport(data);
            } catch (error) {
                this.showNotification('Ошибка парсинга JSON: ' + error.message, 'error');
            }
        };

        reader.readAsText(file);
    }

    /**
     * Импорт из JSON (текстовое поле)
     */
    importFromJSON() {
        const jsonText = document.getElementById('import-json')?.value;
        if (!jsonText) {
            this.showNotification('Введите JSON для импорта', 'error');
            return;
        }

        try {
            const data = JSON.parse(jsonText);
            this.processImport(data);
        } catch (error) {
            this.showNotification('Ошибка парсинга JSON: ' + error.message, 'error');
        }
    }

    /**
     * Обработка импортированных данных
     */
    processImport(data) {
        const merge = document.getElementById('import-merge')?.checked || false;
        const replaceImage = document.getElementById('import-replace-image')?.checked || false;

        try {
            // Проверка версии и конвертация
            const processedData = this.normalizeImportedData(data);

            if (!merge) {
                // Очищаем существующие данные
                if (processedData.rooms && this.dataManager.clearPolygons) {
                    this.dataManager.clearPolygons();
                } else if (processedData.rooms && this.dataManager.clearRooms) {
                    this.dataManager.clearRooms();
                }
                
                if (processedData.points && this.dataManager.clearPoints) {
                    this.dataManager.clearPoints();
                }
                
                if (processedData.connections && this.dataManager.clearConnections) {
                    this.dataManager.clearConnections();
                }
            }

            // Импортируем кабинеты
            if (processedData.rooms && processedData.rooms.length > 0) {
                processedData.rooms.forEach(room => {
                    if (merge && this.dataManager.getPolygon && this.dataManager.getPolygon(room.id)) return;
                    
                    if (this.dataManager.addPolygon) {
                        this.dataManager.addPolygon(room);
                    }
                });
            }

            // Импортируем точки
            if (processedData.points && processedData.points.length > 0) {
                processedData.points.forEach(point => {
                    if (merge && this.dataManager.getPoint && this.dataManager.getPoint(point.id)) return;
                    
                    if (this.dataManager.addPoint) {
                        this.dataManager.addPoint(point);
                    }
                });
            }

            // Импортируем соединения
            if (processedData.connections && processedData.connections.length > 0) {
                processedData.connections.forEach(conn => {
                    if (merge && this.dataManager.getConnection && this.dataManager.getConnection(conn.id)) return;
                    
                    if (this.dataManager.addConnection) {
                        this.dataManager.addConnection(conn.from, conn.to, conn);
                    }
                });
            }

            // Импортируем путь к изображению
            if (replaceImage && processedData.imagePath) {
                if (this.dataManager.saveImagePath) {
                    this.dataManager.saveImagePath(processedData.imagePath);
                }
                if (this.mapCore && this.mapCore.changeImage) {
                    this.mapCore.changeImage(processedData.imagePath);
                }
            }

            // Обновляем отображение
            this.refreshAllEditors();

            this.showNotification(
                `Карта "${processedData.name || 'без названия'}" загружена!\n` +
                `Кабинеты: ${processedData.rooms?.length || 0}, ` +
                `Точки: ${processedData.points?.length || 0}, ` +
                `Соединения: ${processedData.connections?.length || 0}`,
                'success'
            );

            this.updateMapInfo();
            document.getElementById('import-json').value = '';

        } catch (error) {
            console.error('Ошибка импорта:', error);
            this.showNotification('Ошибка импорта: ' + error.message, 'error');
        }
    }

    /**
     * Нормализация импортированных данных
     */
    normalizeImportedData(data) {
        // Если данные в компактном формате
        if (data.rooms && data.rooms[0] && data.rooms[0].n !== undefined) {
            return {
                version: data.version || '2.0',
                name: data.name || 'Imported Map',
                rooms: data.rooms.map(r => ({
                    id: r.id,
                    name: r.n,
                    vertices: r.v,
                    color: r.c || '#3498db',
                    department: r.d || '',
                    employees: r.e || '',
                    phone: r.p || ''
                })),
                points: data.points.map(p => ({
                    id: p.id,
                    name: p.n,
                    y: p.y,
                    x: p.x,
                    type: p.t || 'point_of_interest',
                    isRouting: p.r !== false,
                    color: p.c || '#2ecc71',
                    roomId: p.ri || null
                })),
                connections: data.connections.map(c => ({
                    id: c.id,
                    from: c.f,
                    to: c.t,
                    length: c.l || 0,
                    isBidirectional: c.b !== false,
                    color: '#2ecc71',
                    weight: 4
                })),
                imagePath: data.imagePath
            };
        }

        // Обычный формат
        return data;
    }

    /**
     * Создание резервной копии
     */
    createBackup() {
        // БЕЗОПАСНО получаем путь к изображению
        let imagePath = 'img/plan.png';
        try {
            if (this.dataManager.getImagePath && typeof this.dataManager.getImagePath === 'function') {
                imagePath = this.dataManager.getImagePath();
            } else if (this.dataManager.data && this.dataManager.data.imagePath) {
                imagePath = this.dataManager.data.imagePath;
            }
        } catch (e) {
            console.warn('Не удалось получить путь к изображению:', e);
        }
        
        const data = {
            version: '2.0',
            name: document.getElementById('map-name')?.value || 'backup',
            date: new Date().toISOString(),
            rooms: this.dataManager.getAllPolygons ? this.dataManager.getAllPolygons() : [],
            points: this.dataManager.getAllPoints ? this.dataManager.getAllPoints() : [],
            connections: this.dataManager.getAllConnections ? this.dataManager.getAllConnections() : [],
            imagePath: imagePath,
            stats: this.getStats()
        };

        // Сохраняем в localStorage
        const backups = this.getBackups();
        const backupId = 'backup_' + Date.now();
        
        backups[backupId] = {
            id: backupId,
            name: data.name,
            date: data.date,
            size: JSON.stringify(data).length,
            data: data
        };

        // Оставляем только последние 10 бэкапов
        const backupList = Object.values(backups).sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        ).slice(0, 10);

        const newBackups = {};
        backupList.forEach(b => newBackups[b.id] = b);
        
        localStorage.setItem('mapBackups', JSON.stringify(newBackups));
        
        this.updateBackupList();
        this.showNotification(`Бэкап "${data.name}" создан`, 'success');
    }

    /**
     * Получение списка бэкапов
     */
    getBackups() {
        try {
            return JSON.parse(localStorage.getItem('mapBackups')) || {};
        } catch {
            return {};
        }
    }

    /**
     * Обновление списка бэкапов в UI
     */
    updateBackupList() {
        const select = document.getElementById('backup-list');
        const restoreBtn = document.getElementById('restore-backup-btn');
        const deleteBtn = document.getElementById('delete-backup-btn');
        
        if (!select) return;

        const backups = this.getBackups();
        const backupList = Object.values(backups).sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );

        if (backupList.length === 0) {
            select.innerHTML = '<option value="">Нет сохраненных бэкапов</option>';
            if (restoreBtn) restoreBtn.disabled = true;
            if (deleteBtn) deleteBtn.disabled = true;
            return;
        }

        select.innerHTML = backupList.map(b => `
            <option value="${b.id}">
                ${b.name} - ${new Date(b.date).toLocaleString()} (${(b.size/1024).toFixed(1)} KB)
            </option>
        `).join('');

        if (restoreBtn) restoreBtn.disabled = false;
        if (deleteBtn) deleteBtn.disabled = false;
    }

    /**
     * Восстановление из бэкапа
     */
    restoreBackup(backupId) {
        if (!backupId) return;

        const backups = this.getBackups();
        const backup = backups[backupId];
        
        if (!backup) return;

        if (confirm(`Восстановить карту "${backup.name}" от ${new Date(backup.date).toLocaleString()}?`)) {
            this.processImport(backup.data);
            this.showNotification(`Карта "${backup.name}" восстановлена`, 'success');
        }
    }

    /**
     * Удаление бэкапа
     */
    deleteBackup(backupId) {
        if (!backupId) return;

        const backups = this.getBackups();
        delete backups[backupId];
        
        localStorage.setItem('mapBackups', JSON.stringify(backups));
        this.updateBackupList();
        this.showNotification('Бэкап удален', 'info');
    }

    /**
     * Быстрое сохранение (в localStorage)
     */
    quickSave() {
        // БЕЗОПАСНО получаем путь к изображению
        let imagePath = 'img/plan.png';
        try {
            if (this.dataManager.getImagePath && typeof this.dataManager.getImagePath === 'function') {
                imagePath = this.dataManager.getImagePath();
            } else if (this.dataManager.data && this.dataManager.data.imagePath) {
                imagePath = this.dataManager.data.imagePath;
            }
        } catch (e) {
            console.warn('Не удалось получить путь к изображению:', e);
        }
        
        const data = {
            rooms: this.dataManager.getAllPolygons ? this.dataManager.getAllPolygons() : [],
            points: this.dataManager.getAllPoints ? this.dataManager.getAllPoints() : [],
            connections: this.dataManager.getAllConnections ? this.dataManager.getAllConnections() : [],
            imagePath: imagePath
        };

        localStorage.setItem('quickSave', JSON.stringify(data));
        localStorage.setItem('quickSaveTime', new Date().toISOString());
        
        this.showNotification('Быстрое сохранение выполнено (F5)', 'success');
        this.updateMapInfo();
    }

    /**
     * Быстрая загрузка (из localStorage)
     */
    quickLoad() {
        const saved = localStorage.getItem('quickSave');
        if (!saved) {
            this.showNotification('Нет быстрого сохранения', 'warning');
            return;
        }

        try {
            const data = JSON.parse(saved);
            
            if (confirm('Загрузить быстрое сохранение?')) {
                if (this.dataManager.clearPolygons) {
                    this.dataManager.clearPolygons();
                } else if (this.dataManager.clearRooms) {
                    this.dataManager.clearRooms();
                }
                
                if (this.dataManager.clearPoints) {
                    this.dataManager.clearPoints();
                }
                
                if (this.dataManager.clearConnections) {
                    this.dataManager.clearConnections();
                }

                data.rooms?.forEach(room => {
                    if (this.dataManager.addPolygon) {
                        this.dataManager.addPolygon(room);
                    }
                });
                
                data.points?.forEach(point => {
                    if (this.dataManager.addPoint) {
                        this.dataManager.addPoint(point);
                    }
                });
                
                data.connections?.forEach(conn => {
                    if (this.dataManager.addConnection) {
                        this.dataManager.addConnection(conn.from, conn.to, conn);
                    }
                });

                if (data.imagePath && this.dataManager.saveImagePath) {
                    this.dataManager.saveImagePath(data.imagePath);
                    if (this.mapCore && this.mapCore.changeImage) {
                        this.mapCore.changeImage(data.imagePath);
                    }
                }

                this.refreshAllEditors();
                this.showNotification('Быстрая загрузка выполнена (F9)', 'success');
                this.updateMapInfo();
            }
        } catch (error) {
            this.showNotification('Ошибка загрузки: ' + error.message, 'error');
        }
    }

    /**
     * Обновление информации о карте (с защитой от рекурсии)
     */
    updateMapInfo() {
        // Защита от рекурсии
        if (this._updating) return;
        this._updating = true;
        
        try {
            const rooms = this.dataManager.getAllPolygons?.() || [];
            const points = this.dataManager.getAllPoints?.() || [];
            const connections = this.dataManager.getAllConnections?.() || [];

            const infoRooms = document.getElementById('info-rooms');
            const infoPoints = document.getElementById('info-points');
            const infoConnections = document.getElementById('info-connections');
            const infoSize = document.getElementById('info-size');
            const infoSaved = document.getElementById('info-saved');
            
            if (infoRooms) infoRooms.textContent = rooms.length;
            if (infoPoints) infoPoints.textContent = points.length;
            if (infoConnections) infoConnections.textContent = connections.length;

            // Размер JSON
            let imagePath = 'img/plan.png';
            try {
                if (this.dataManager.getImagePath && typeof this.dataManager.getImagePath === 'function') {
                    imagePath = this.dataManager.getImagePath();
                }
            } catch (e) {}
            
            const testData = {
                rooms, points, connections,
                imagePath: imagePath
            };
            const size = JSON.stringify(testData).length / 1024;
            if (infoSize) infoSize.textContent = size.toFixed(1);

            // Время последнего сохранения
            const quickSaveTime = localStorage.getItem('quickSaveTime');
            if (infoSaved) {
                infoSaved.textContent = quickSaveTime ? new Date(quickSaveTime).toLocaleString() : 'никогда';
            }
        } finally {
            this._updating = false;
        }
    }

    /**
     * Получение статистики
     */
    getStats() {
        return {
            rooms: this.dataManager.getAllPolygons?.().length || 0,
            points: this.dataManager.getAllPoints?.().length || 0,
            connections: this.dataManager.getAllConnections?.().length || 0
        };
    }

    /**
     * Обновление всех редакторов
     */
    refreshAllEditors() {
        if (window.app?.polygonsEditor) {
            window.app.polygonsEditor.loadPolygonsToMap();
        }
        if (window.app?.routingEditor) {
            window.app.routingEditor.loadAllVisualElements();
        }
    }

    /**
     * Показ уведомления
     */
    showNotification(message, type = 'info') {
        if (window.Utils && window.Utils.showNotification) {
            window.Utils.showNotification(message, type);
        } else {
            alert(message);
        }
    }
}

// Экспортируем класс
window.MapImporter = MapImporter;
