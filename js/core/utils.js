/**
 * Утилиты для редактора карты офиса
 */

class Utils {
    /**
     * Генерация уникального ID
     * @returns {string} Уникальный ID
     */
    static generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Экранирование HTML строк для безопасности
     * @param {string} text - Текст для экранирования
     * @returns {string} Экранированный текст
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Проверка валидности координат
     * @param {number} y - Координата Y (широта)
     * @param {number} x - Координата X (долгота)
     * @returns {boolean} true если координаты валидны
     */
    static isValidCoords(y, x) {
		// Для CRS.Simple принимаем любые числовые координаты
		// Границы устанавливаются в map-core.js (0-1080 по Y, 0-1920 по X)
		return typeof y === 'number' && typeof x === 'number' && 
			   !isNaN(y) && !isNaN(x);
	}
	
	/**
	 * Проверка координат на соответствие границам карты
	 * @param {number} y - Координата Y
	 * @param {number} x - Координата X
	 * @param {Array} bounds - Границы карты [[yMin, xMin], [yMax, xMax]]
	 * @returns {boolean} true если координаты в пределах карты
	 */
	static isInMapBounds(y, x, bounds) {
		if (!bounds || bounds.length !== 2) return true;
		
		const [min, max] = bounds;
		return y >= min[0] && y <= max[0] && 
			   x >= min[1] && x <= max[1];
	}
	
    /**
     * Форматирование координат для отображения
     * @param {number} y - Координата Y
     * @param {number} x - Координата X
     * @returns {string} Отформатированные координаты
     */
    static formatCoords(y, x) {
        return `y=${Math.round(y)}, x=${Math.round(x)}`;
    }

    /**
     * Показ уведомления
     * @param {string} message - Сообщение
     * @param {string} type - Тип уведомления (success, error, info, warning)
     */
    static showNotification(message, type = 'info') {
        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        // Устанавливаем стили
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease-out;
            max-width: 400px;
            word-wrap: break-word;
        `;
        
        // Цвета в зависимости от типа
        const colors = {
            success: '#2ecc71',
            error: '#e74c3c',
            info: '#3498db',
            warning: '#f39c12'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;
        
        // Иконка в зависимости от типа
        const icons = {
            success: '<i class="fas fa-check-circle"></i> ',
            error: '<i class="fas fa-exclamation-circle"></i> ',
            info: '<i class="fas fa-info-circle"></i> ',
            warning: '<i class="fas fa-exclamation-triangle"></i> '
        };
        
        notification.innerHTML = icons[type] + Utils.escapeHtml(message);
        
        // Добавляем на страницу
        document.body.appendChild(notification);
        
        // Удаляем через 4 секунды
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
        
        // Добавляем CSS анимации если их нет
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Показать модальное окно с подтверждением
     * @param {string} title - Заголовок
     * @param {string} message - Сообщение
     * @param {string} type - Тип (warning, danger, info)
     * @returns {Promise<boolean>} Promise, который резолвится true/false
     */
    static showModal(title, message, type = 'warning') {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirm-modal');
            const modalTitle = document.getElementById('confirm-title');
            const modalMessage = document.getElementById('confirm-message');
            
            if (!modal || !modalTitle || !modalMessage) {
                console.error('Модальное окно не найдено в DOM');
                resolve(false);
                return;
            }
            
            // Устанавливаем заголовок и сообщение
            modalTitle.textContent = title;
            modalMessage.textContent = message;
            
            // Настраиваем кнопки
            const okBtn = document.getElementById('confirm-ok');
            const cancelBtn = document.getElementById('confirm-cancel');
            
            if (okBtn && cancelBtn) {
                // Удаляем старые обработчики
                const newOkBtn = okBtn.cloneNode(true);
                const newCancelBtn = cancelBtn.cloneNode(true);
                
                okBtn.parentNode.replaceChild(newOkBtn, okBtn);
                cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
                
                // Добавляем новые обработчики
                newOkBtn.addEventListener('click', () => {
                    modal.classList.remove('active');
                    resolve(true);
                });
                
                newCancelBtn.addEventListener('click', () => {
                    modal.classList.remove('active');
                    resolve(false);
                });
                
                // Показываем модальное окно
                modal.classList.add('active');
            }
        });
    }

    /**
     * Форматирование даты для отображения
     * @param {string|Date} date - Дата
     * @returns {string} Отформатированная дата
     */
    static formatDate(date) {
        const d = new Date(date);
        return d.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Расчет расстояния между двумя точками
     * @param {number} y1 - Y координата первой точки
     * @param {number} x1 - X координата первой точки
     * @param {number} y2 - Y координата второй точки
     * @param {number} x2 - X координата второй точки
     * @returns {number} Расстояние
     */
    static calculateDistance(y1, x1, y2, x2) {
        return Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));
    }

    /**
     * Получение параметров из URL
     * @param {string} name - Имя параметра
     * @returns {string|null} Значение параметра
     */
    static getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    /**
     * Сохранение данных в localStorage с обработкой ошибок
     * @param {string} key - Ключ
     * @param {any} data - Данные
     * @returns {boolean} Успешно ли сохранено
     */
    static saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Ошибка сохранения в localStorage:', error);
            return false;
        }
    }

    /**
     * Загрузка данных из localStorage
     * @param {string} key - Ключ
     * @param {any} defaultValue - Значение по умолчанию
     * @returns {any} Данные или defaultValue
     */
    static loadFromLocalStorage(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Ошибка загрузки из localStorage:', error);
            return defaultValue;
        }
    }

    /**
     * Проверка, находится ли точка внутри полигона
     * @param {Array} point - Точка [y, x]
     * @param {Array} polygon - Полигон [[y1, x1], [y2, x2], ...]
     * @returns {boolean} true если точка внутри полигона
     */
    static isPointInPolygon(point, polygon) {
        const [y, x] = point;
        let inside = false;
        
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const [yi, xi] = polygon[i];
            const [yj, xj] = polygon[j];
            
            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            
            if (intersect) inside = !inside;
        }
        
        return inside;
    }

    /**
     * Расчет центра полигона
     * @param {Array} polygon - Полигон [[y1, x1], [y2, x2], ...]
     * @returns {Array} Центр [y, x]
     */
    static getPolygonCenter(polygon) {
        if (!polygon || polygon.length === 0) {
            return [0, 0];
        }
        
        let sumY = 0;
        let sumX = 0;
        
        for (const [y, x] of polygon) {
            sumY += y;
            sumX += x;
        }
        
        return [sumY / polygon.length, sumX / polygon.length];
    }

    /**
     * Расчет площади полигона (метод шнуровки)
     * @param {Array} polygon - Полигон [[y1, x1], [y2, x2], ...]
     * @returns {number} Площадь
     */
    static calculatePolygonArea(polygon) {
        let area = 0;
        const n = polygon.length;
        
        if (n < 3) return 0;
        
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const [yi, xi] = polygon[i];
            const [yj, xj] = polygon[j];
            
            area += xi * yj;
            area -= xj * yi;
        }
        
        return Math.abs(area) / 2;
    }

    /**
     * Создание deep копии объекта
     * @param {any} obj - Объект для копирования
     * @returns {any} Глубокая копия
     */
    static deepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Округление числа с заданной точностью
     * @param {number} num - Число
     * @param {number} decimals - Количество знаков после запятой
     * @returns {number} Округленное число
     */
    static round(num, decimals = 2) {
        const factor = Math.pow(10, decimals);
        return Math.round(num * factor) / factor;
    }

    /**
     * Генератор цветов на основе строки (для консистентного окрашивания)
     * @param {string} str - Строка для генерации цвета
     * @returns {string} HEX цвет
     */
    static stringToColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const color = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + '00000'.substring(0, 6 - color.length) + color;
    }

    /**
     * Дебаунс функция для оптимизации частых вызовов
     * @param {Function} func - Функция
     * @param {number} wait - Время задержки в мс
     * @returns {Function} Дебаунсированная функция
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Форматирование номера телефона
     * @param {string} phone - Номер телефона
     * @returns {string} Отформатированный номер
     */
    static formatPhone(phone) {
        if (!phone) return '';
        
        // Удаляем все нецифровые символы
        const digits = phone.replace(/\D/g, '');
        
        // Форматируем в зависимости от длины
        if (digits.length === 3) {
            return digits;
        } else if (digits.length === 4) {
            return digits.replace(/(\d{2})(\d{2})/, '$1-$2');
        } else if (digits.length === 6) {
            return digits.replace(/(\d{2})(\d{2})(\d{2})/, '$1-$2-$3');
        } else if (digits.length === 7) {
            return digits.replace(/(\d{3})(\d{2})(\d{2})/, '$1-$2-$3');
        } else if (digits.length === 10) {
            return digits.replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, '+7 ($1) $2-$3-$4');
        }
        
        return phone;
    }

    /**
     * Проверка на пустой объект
     * @param {object} obj - Объект для проверки
     * @returns {boolean} true если объект пустой
     */
    static isEmptyObject(obj) {
        return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
    }

    /**
     * Создание data URL из Blob (для экспорта)
     * @param {Blob} blob - Blob объект
     * @returns {Promise<string>} data URL
     */
    static blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Скачивание файла
     * @param {string} content - Содержимое файла
     * @param {string} filename - Имя файла
     * @param {string} type - MIME тип
     */
    static downloadFile(content, filename, type = 'text/plain') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Копирование текста в буфер обмена
     * @param {string} text - Текст для копирования
     * @returns {Promise<boolean>} Успешно ли скопировано
     */
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            Utils.showNotification('Скопировано в буфер обмена', 'success');
            return true;
        } catch (error) {
            console.error('Ошибка копирования в буфер обмена:', error);
            
            // Fallback метод для старых браузеров
            try {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                Utils.showNotification('Скопировано в буфер обмена', 'success');
                return true;
            } catch (fallbackError) {
                Utils.showNotification('Не удалось скопировать в буфер обмена', 'error');
                return false;
            }
        }
    }

    /**
     * Обработка ошибок с пользовательским сообщением
     * @param {Error} error - Объект ошибки
     * @param {string} context - Контекст ошибки
     */
    static handleError(error, context = '') {
        console.error(`${context}:`, error);
        
        let message = 'Произошла ошибка';
        if (error.message) {
            message = error.message;
        }
        
        Utils.showNotification(`${context ? context + ': ' : ''}${message}`, 'error');
    }
	
	/**
	 * Показывает кастомное модальное окно с произвольным HTML
	 * @param {string} title - Заголовок модального окна
	 * @param {string} htmlContent - HTML содержимое
	 * @param {Array} buttons - Массив названий кнопок
	 * @returns {Promise<string>} Promise, который разрешается названием нажатой кнопки
	 */
	static async showCustomModal(title, htmlContent, buttons = ['Отмена', 'ОК']) {
		return new Promise((resolve) => {
			const modalId = 'custom-modal-' + Date.now();
			
			// Создаем модальное окно
			const modalHTML = `
				<div class="modal active" id="${modalId}">
					<div class="modal-content" style="max-width: 600px;">
						<div class="modal-header">${title}</div>
						<div class="modal-body">
							${htmlContent}
						</div>
						<div class="modal-footer">
							${buttons.map((btn, index) => 
								`<button class="btn ${index === buttons.length - 1 ? 'btn-success' : 'btn-danger'}" 
										data-result="${btn}">${btn}</button>`
							).join('')}
						</div>
					</div>
				</div>
			`;
			
			// Добавляем в body
			const modalDiv = document.createElement('div');
			modalDiv.innerHTML = modalHTML;
			document.body.appendChild(modalDiv);
			
			const modalElement = document.getElementById(modalId);
			
			// Обработчики для кнопок
			modalElement.querySelectorAll('button').forEach(button => {
				button.addEventListener('click', () => {
					const result = button.dataset.result;
					modalElement.remove();
					resolve(result);
				});
			});
			
			// Закрытие по клику на фон
			modalElement.addEventListener('click', (e) => {
				if (e.target === modalElement) {
					modalElement.remove();
					resolve(null);
				}
			});
			
			// Закрытие по Escape
			const closeOnEscape = (e) => {
				if (e.key === 'Escape') {
					modalElement.remove();
					document.removeEventListener('keydown', closeOnEscape);
					resolve(null);
				}
			};
			
			document.addEventListener('keydown', closeOnEscape);
		});
	}	
}

// Экспортируем утилиты для глобального использования
window.Utils = Utils;
