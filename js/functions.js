/* Определяем глобальные переменные */
const LOG_DISABLE = 0;
const LOG_VNDS = 1;
const LOG_ALL = 2;

const LOAD_MOD = 0;
const SAVE_MOD = 1;

var config =
{
	sound_volume: 0.5,            // громкость звука
	is_sound: true,               // включён или выключен звук

	text_size: 0,                 // размер шрифта и некоторых других элементов интерфейса

	effect_speed: 350,            // скорость эффектов (меньше - быстрее)
	text_speed: 20,               // скорость вывода текста (меньше - выше)

	is_skip: false,               // включён или выключен быстрый пропуск
	is_skip_unread: false,        // пропускать ли непрочитанное
	skip_effect_speed: 100,       // скорость эффектов при быстром пропуске (меньше - быстрее)
	skip_text_speed: 0,           // скорость вывода текста при быстром пропуске (меньше - выше)
	skip_text_pause: 100,         // задержка после вывода текста перед сменой экрана

	is_auto: false,               // включено или выключено авточтение
	auto_text_pause: 2000,        // задержка после вывода текста перед сменой экрана

	notification_delay: 1200,     // Задержка вывода оповещения
	
	log_level: LOG_DISABLE,       // Выводить ли в консоль информацию

	is_error_log: true,           // Сохранять ли ошибки в log-файлы (только при is_php_enabled: true)

	is_fullscreen: false,         // включён ли полноэкранный режим
	min_width: 640,               // минимальное разрешение экрана: ширина
	min_height: 480               // минимальное разрешение экрана: высота
};

var title;                      // Дефолтный заголовок страницы
var favicon;                    // Дефолтный фавикон
var old_effect_speed;           // Предыдущая скорость эффектов в окне сообщений
var old_text_speed;             // Предыдущая скорость вывода текста в окне сообщений
var music_volume;               // Текущая громкость музыки для эффекта затухания
var is_message_box;             // Переменная, хранящая состояние блока вывода текста
var type_interval;              // Переменная для хранения идентификатора интервала при печати печатающей машинки
var filters_timeouts = [];       // Переменная для хранения массива идентификаторов интервалов, использующихся для фильтров
var effects_timeouts = [];       // Переменная для хранения массива идентификаторов интервалов, использующихся для эффектов
var is_promo = false;           // Информация о том, был ли произведён клик на баннер или нет
var vn;                         // Объект класса интерпретатора
var is_php_enabled;             // Имеется ли поддержка php на сервере
var is_skip_enabled;            // Активна ли кнопка быстрого пропуска
var resolution =                // Разрешение окна игры (равное или разрешению игры, или размеру окна экрана браузера)
		{
			width: null,              // ширина
			height: null,             // высота
			ratio: null               // коэффициент относительно разрешения игры
		}
var font_size_ratio;            // Коэффициент размера шрифта, в зависимости от размера окна

$(document).ready(function()
{
	title = $('title').text();
	favicon = $('#favicon').attr('href');
	load_settings();
	set_sound(config.is_sound);
	init_log();
	init_thanks();
	bind_window_resize_events();
	check_php_enabled(create_main_menu);
});

// Функция проверки поддержки php на сервере
function check_php_enabled(callback)
{
	let func_name = get_function_name(arguments.callee);
	$.get('php/check_php.php')
		.done(function(data)
		{
			is_php_enabled = (typeof(data) === 'string') && (data == "1");
		})
		.fail(function()
		{
			is_php_enabled = false;
		})
		.always(function()
		{
			if (config.log_level == LOG_ALL) console.log(func_name + ': ' + is_php_enabled);
			$('#info_php_enabled').text(is_php_enabled);
			if (callback !== undefined)
				callback();
		});
}

// Функция, отвечающая за присвоение обработчика события изменения размера экрана браузера
function bind_window_resize_events()
{
	exec_window_resize_events();
	$(window).on('resize', exec_window_resize_events);
}

// Функция, выполняемая при наступлении события изменения размера экрана браузера и некоторых других
function exec_window_resize_events()
{
	let win_width = (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth) - 2;
	let win_height = (window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight) - 2;
	$('#info_screen_resolution').text(win_width + 'x' + win_height);
	if ((vn !== undefined) && (vn.game.resolution.width !== null) && (vn.game.resolution.height !== null))
	{
		if (resolution.width === null)
			resolution.width = vn.game.resolution.width;
		if (resolution.height === null)
			resolution.height = vn.game.resolution.height;

		let height;
		let width;
		if (!config.is_fullscreen && (win_width >= vn.game.resolution.width))
		{
			if (win_height >= vn.game.resolution.height)
				height = vn.game.resolution.height;
			else
				height = win_height;
			width = Math.floor(height / vn.game.resolution.ratio);
		}
		else
		{
			if (!config.is_fullscreen && (win_height >= vn.game.resolution.height))
			{
				width = win_width;
				height = Math.floor(width * vn.game.resolution.ratio);
			}
			else
			{
				height = win_height;
				width = Math.floor(height / vn.game.resolution.ratio);
				if (win_width < width)
				{
					width = win_width;
					height = Math.floor(width * vn.game.resolution.ratio);
				}
			}
		}
		if ((width >= config.min_width) && (height >= config.min_height))
		{
			resolution.width = width;
			resolution.height = height;
			if (!$('#save_load_menu').is(':visible'))
				resize_save_load_menu();
		}
		$('#game_screen').css(
		{
			'width': resolution.width + 'px',
			'height': resolution.height + 'px'
		});
		resolution.ratio = resolution.width / vn.game.resolution.width;
		if ($('#message_box').height() <= 170)
			font_size_ratio = 1;
		else
			font_size_ratio = resolution.ratio;
		
		$('#message_box_text').css('font-size', font_size_ratio * (10 + config.text_size) / 10 + 'em');
		$('#message_box_name').css('font-size', font_size_ratio * (11 + config.text_size) / 10 + 'em');
}
	else
	{
		resolution.width = null;
		resolution.height = null;
	}
}

// Функция создания окна лога
function init_log()
{
	if (config.log_level == LOG_ALL) console.log(get_function_name(arguments.callee));
	let $info = $('#info');
	$info.find('span').hide();

	$info.on('click', function()
	{
		if ($(this).css('top') === '0px')
		{
			$info.animate(
			{
				top: '-175px',
				left: '-180px',
				'padding-bottom': '30px'
			}, 200);
			$info.find('span').hide(50);
			$('#info_show').fadeIn(170);
		}
		else
		{
			$info.find('span').show(50);
			$info.animate(
			{
				top: '0',
				left: '0',
				'padding-bottom': '10px'
			}, 200);
			$('#info_show').fadeOut(100);
		}
	});
	$(document).on('keydown', function(e) // Вешаем на тильду открытие/скрытие консоли
	{
		if (e.which === 192)
			$info.trigger('click');
	});
}

// Функция создания окна копирайта
function init_thanks()
{
	if (config.log_level == LOG_ALL) console.log(get_function_name(arguments.callee));
	let $thanks = $('#thanks');

	$thanks.on('click', function()
	{
		if ($(this).css('top') === '0px')
		{
			$thanks.animate(
			{
				top: '-116px',
				right: '-475px',
				'padding-bottom': '30px'
			}, 200);
			$('#thanks_show').fadeIn(170);
		}
		else
		{
			$thanks.animate(
			{
				top: '0',
				right: '0',
				'padding-bottom': '10px'
			}, 200);
			$('#thanks_show').fadeOut(100);
		}
	});
}


// Функция, получающая список игр и их настройки
function create_main_menu()
{
	if (config.log_level == LOG_ALL) console.log(get_function_name(arguments.callee));
	let $main_screen = $('#main_screen')
	$main_screen.stop().fadeIn(config.effect_speed);;
	show_promo();

	$('title').text(title);
	$('#favicon').remove();
	$('<link id="favicon" rel="icon" />')
		.attr('href', 'images/vnds.png')
		.appendTo('head');
	$('#info_game_name').text('');
	$('#info_game_resolution').text('');
	let games_list_source;
	if (is_php_enabled)
		games_list_source = "php/get_games_list.php";
	else
		games_list_source = "games/games_list.json";

	$.get(games_list_source)
		.done(function(data)
		{
			let games_list;
			if (typeof(data) === 'object')
				games_list = data;
			else
				games_list = JSON.parse(data);

			$.each(games_list, function(key, value)
			{
				if (value.error !== null)
				{
					show_error(value.error);
				}
				else
				{
					let id = 'game_' + key;
					let $id = $('#' + id);
					if (!$id.length)
					{
						$('<button>')
							.attr('id', id)
							.attr('value', key)
							.appendTo('#main_menu');
						$id = $('#' + id);
						if (value.thumb_s !== null)
						{
							$('<img />')
								.attr('src', value.thumb_s)
								.appendTo($id);
						}
						$id.append('<div>' + value.full_name + '</div>');
					}
					$id.on('click', function()
					{
						$main_screen.find('*').off('click');
						vn = new vnds_interpreter();
						vn.init();
						vn.game.dir = value.dir;
						vn.game.full_name = value.full_name;
						vn.game.short_name = value.short_name;
						vn.game.resolution =
						{
							width: value.width,
							height: value.height,
							ratio: value.height / value.width
						};
						vn.game.icons =
						{
							small: value.icon_s,
							big: value.icon_b
						}
						vn.game.thumbs =
						{
							small: value.thumb_s,
							big: value.thumb_b
						}
						vn.game.script_line_num = 0;
						exec_window_resize_events();
						$main_screen.stop().fadeOut(config.effect_speed, function()
						{
							$('title').text(title + ' : ' + vn.game.full_name);
							$('#favicon').remove();
							$('<link id="favicon" rel="icon" />')
								.attr('href', vn.game.icons.small)
								.appendTo('head');
							$('#info_game_name').text(vn.game.full_name);
							$('#info_game_resolution').text(vn.game.resolution.width + 'x' + vn.game.resolution.height);
							$('#game_screen').stop().fadeIn(config.effect_speed);
							create_game_menu();
						});
					});
				}
			});
		})
		.fail(function(jqXHR, textStatus, errorThrown)
		{
			show_error('Incorrect AJAX-request: ' + errorThrown);
		});
}

// Функция проверки поддержки браузером локального хранилища
function supports_local_storage()
{
  try
	{
		if ('localStorage' in window && window['localStorage'] !== null)
			return true;
		else
		{
			show_error('Browser not support local storage');
			return false;
		}
	}
	catch (e)
	{
		show_error('Browser not support local storage');
		return false;
	}
}

// Функция загрузки параметров сессии
function load_settings()
{
	if (config.log_level == LOG_ALL) console.log(get_function_name(arguments.callee));
	if (supports_local_storage())
	{
		try
		{
			let item;
			item = localStorage.getItem('is_sound');
			if (item !== null)
				config.is_sound = Boolean(Number(item));
			item = localStorage.getItem('sound_volume');
			if (item !== null)
				config.sound_volume = Number(item);
			item = localStorage.getItem('text_speed');
			if (item !== null)
				config.text_speed = Number(item);
			item = localStorage.getItem('auto_text_pause');
			if (item !== null)
				config.auto_text_pause = Number(item);
			item = localStorage.getItem('is_skip_unread');
			if (item !== null)
				config.is_skip_unread = Boolean(Number(item));
			item = localStorage.getItem('is_fullscreen');
			if (item !== null)
				config.is_fullscreen = Boolean(Number(item));
			item = localStorage.getItem('text_size');
			if (item !== null)
				config.text_size = Number(item);
			item = localStorage.getItem('log_level');
			if (item !== null)
				config.log_level = Number(item);
		}
		catch (e)
		{
			show_warning('Error in local storage ' + e.name);
			return false;
		}
	}
	apply_text_size();
}

// Функция сохранения параметров сессии
function save_settings()
{
	if (config.log_level == LOG_ALL) console.log(get_function_name(arguments.callee));
	if (supports_local_storage())
	{
		try
		{
			localStorage.setItem('is_sound', Number(config.is_sound));
			localStorage.setItem('sound_volume', Number(config.sound_volume));
			localStorage.setItem('text_speed', Number(config.text_speed));
			localStorage.setItem('auto_text_pause', Number(config.auto_text_pause));
			localStorage.setItem('is_skip_unread', Number(config.is_skip_unread));
			localStorage.setItem('text_size', Number(config.text_size));
			localStorage.setItem('is_fullscreen', Number(config.is_fullscreen));
			localStorage.setItem('log_level', Number(config.log_level));
		}
		catch (e)
		{
			show_warning('Error in local storage ' + e.name);
			return false;
		}
	}
	apply_text_size();
}

// Функция, изменяющая стили в зависимости от настройки размера шрифта в настройках
function apply_text_size()
{
	let $message_box = $('#message_box');
	if ($message_box.height() <= 170)
	{
		$message_box.css('height', (12 + config.text_size * 2.5) * 10 + 'px');
	}
	$('#message_box_menu').css('font-size', (9 + config.text_size) / 10 + 'em');
	$('#message_box_name').css('font-size', font_size_ratio * (11 + config.text_size) / 10 + 'em');
	$('#message_box_text').css('font-size', font_size_ratio * (10 + config.text_size) / 10 + 'em');
}

// Функция отображения блока сообщений
function show_message_box()
{
	let $message_box = $('#message_box');
	if ($message_box.is(':visible'))
		return;
	if (config.log_level == LOG_ALL) console.log(get_function_name(arguments.callee));
	$message_box.stop().fadeTo(config.effect_speed, 1, function()
	{
		$('#game_screen')
			.css('cursor', 'default')
			.off('click');
		bind_message_box_events();
	});
}

// Функция скрытия блока сообщений
function hide_message_box(is_clear, callback)
{
	let $message_box = $('#message_box');
	if (!$message_box.is(':visible'))
	{
		if (callback !== undefined)
			callback();
		return;
	}
	if (config.log_level == LOG_ALL) console.log(get_function_name(arguments.callee));
	remove_message_box_events();
	$message_box.stop().fadeOut(config.effect_speed, function()
	{
		if (is_clear)
		{
			$('#message_box_name').html('');
			$('#message_box_text').html('');
		}
		if (callback !== undefined)
			callback();
	});
}

// Очистка всех событий блока сообщений
function remove_message_box_events()
{
	if (config.log_level == LOG_ALL) console.log(get_function_name(arguments.callee));
	$('#message_box').find('a:not(#message_box_next)').off('click');
	$(document).off('keydown.message_box');
}

// Присвоение событий элементам блока сообщений
function bind_message_box_events()
{
	if (config.log_level == LOG_ALL) console.log(get_function_name(arguments.callee));
	let $message_box_menu_load = $('#message_box_menu_load');
	let $message_box_menu_save = $('#message_box_menu_save');
	let $message_box_menu_skip = $('#message_box_menu_skip');
	let $message_box_menu_auto = $('#message_box_menu_auto');
	let $message_box_menu_sound = $('#message_box_menu_sound');
	let $message_box_menu_menu = $('#message_box_menu_menu');
	let $message_box_menu_help = $('#message_box_menu_help');
	let $message_box_menu_hide = $('#message_box_menu_hide');
	let $overlay = $('#overlay');
	let $modal_screen = $('#modal_screen');
	$(document).on('keydown.message_box', function(e)
	{
		let $message_box_next = $('#message_box_next');
		if ((e.which === 13) || (e.which === 32)) // Enter, Space
		{
			if (!$overlay.is(':visible') && (!$modal_screen.is(':visible')) && ($message_box_next.is(':visible')))
			{
				$message_box_next.trigger('click');
				return false;
			}
		}
		if (e.which === 83) // 'S'
		{
			if (!$overlay.is(':visible') && (!$modal_screen.is(':visible')) && ($message_box_next.is(':visible')))
			{
				$message_box_menu_save.trigger('click');
				return false;
			}
		}
		if (e.which === 76) // 'L'
		{
			if (!$overlay.is(':visible') && (!$modal_screen.is(':visible')) && ($message_box_next.is(':visible')))
			{
				$message_box_menu_load.trigger('click');
				return false;
			}
		}
		if (e.ctrlKey) // 'Ctrl'
		{
			if (!$overlay.is(':visible') && (!$modal_screen.is(':visible')))
			{
				$message_box_menu_skip.trigger('click');
			}
		}
		if ((e.which === 65) || (e.shiftKey)) // 'A'
		{
			if (!$overlay.is(':visible') && (!$modal_screen.is(':visible')))
			{
				$message_box_menu_auto.trigger('click');
				return false;
			}
		}
		if (e.which === 77) // 'M'
		{
			if (!$overlay.is(':visible') && (!$modal_screen.is(':visible')))
			{
				$message_box_menu_sound.trigger('click');
				return false;
			}
		}
		if (e.which === 112) // F1
		{
			if (!$overlay.is(':visible') && (!$modal_screen.is(':visible')))
			{
				$message_box_menu_help.trigger('click');
				return false;
			}
		}
		if (e.which === 90) // 'Z'
		{
			if (!$overlay.is(':visible') && (!$modal_screen.is(':visible')))
			{
				$message_box_menu_hide.trigger('click');
				return false;
			}
		}
		if (e.which === 27) // 'Esc'
		{
			if (!$overlay.is(':visible') && (!$modal_screen.is(':visible')))
				$message_box_menu_menu.trigger('click');
		}
	});

	$message_box_menu_load.on('click', function()
	{
		create_save_load_menu(LOAD_MOD);
		return false;
	});
	$message_box_menu_save.on('click', function()
	{
		create_save_load_menu(SAVE_MOD);
		return false;
	});
	$message_box_menu_skip.on('click', function()
	{
		if (is_skip_enabled)
			set_skip(!config.is_skip);
		else
			show_notification('Пропуск непрочитанного отключен', config.notification_delay);
		return false;
	});
	$message_box_menu_auto.on('click', function()
	{
		set_auto(!config.is_auto);
		return false;
	});
	$message_box_menu_sound.on('click', function()
	{
		set_sound(!config.is_sound);
		return false;
	});
	$message_box_menu_menu.on('click', function()
	{
		create_game_menu();
		return false;
	});
	$message_box_menu_help.on('click', function()
	{
		let info = 'Горячие клавиши\r\n';
		info += '<ul>\r\n';
		info += '<li>F1 - справка</li>\r\n';
		info += '<li>S - сохранить игру</li>\r\n';
		info += '<li>L - загрузить игру</li>\r\n';
		info += '<li>Ctrl - включить/выключить режим пропуска</li>\r\n';
		info += '<li>A / Alt - включить/выключить режим авточтения</li>\r\n';
		info += '<li>M - включить/выключить звук</li>\r\n';
		info += '<li>Z - скрыть блок с текстом</li>\r\n';
		info += '<li>Space, Enter - следующий фрагмент</li>\r\n';
		info += '<li>Esc - отмена</li>\r\n';
		info += '</ul>\r\n';
		show_info(info);
		return false;
	});
	$message_box_menu_hide.on('click', function()
	{
		hide_message_box(false, function()
		{
			let $game_screen = $('#game_screen');
			$game_screen
				.css('cursor', 'pointer')
				.on('click', function()
				{
					show_message_box();
					let $sprites = $('#sprites');
					$sprites
						.css('cursor', 'pointer')
						.on('click', function(e)
						{
							let $message_box_next = $('#message_box_next');
							if ($message_box_next.is(':visible'))
								$message_box_next.trigger('click');
							else
								$sprites.off('click');
						});
					return false;
				});
			$(document).on('keydown.message_box', function(e)
			{
				if (e.which === 90) // 'Z'
				{
					if (!$overlay.is(':visible') && (!$modal_screen.is(':visible')))
					{
						show_message_box();
						return false;
					}
				}
			});
		});
		return false;
	});
}

// Функция переключения состояние кнопки быстрого пропуска
function set_skip_enabled(state)
{
	if (is_skip_enabled === state) return;
	if (config.log_level == LOG_ALL) console.log(get_function_name(arguments.callee) + ': ' + state);
	is_skip_enabled = state;
	if (state)
		$('#message_box_menu_skip').removeClass('inactive');
	else
	{
		set_skip(false);
		$('#message_box_menu_skip').addClass('inactive');
	}
}

// Функция быстрого пропуска
function set_skip(state)
{
	if (config.is_skip === state) return;
	if (config.log_level == LOG_ALL) console.log(get_function_name(arguments.callee) + ': ' + state);
	config.is_skip = state;
	let $message_box_text = $('#message_box_text');
	let $message_box_next = $('#message_box_next');
	if (config.is_skip)
	{
		if (config.is_auto) set_auto(false);
		old_effect_speed = config.effect_speed;
		old_text_speed = config.text_speed;
		config.effect_speed = config.skip_effect_speed;
		config.text_speed = config.skip_text_speed;
		$message_box_next.hide();
		$('#message_box_menu_skip').addClass('enabled');
		if (type_interval !== undefined)
			$message_box_next.trigger('click');
		$message_box_next.trigger('click');
	}
	else
	{
		config.effect_speed = old_effect_speed;
		config.text_speed = old_text_speed;
		$message_box_next.show();
		$('#message_box_menu_skip').removeClass('enabled');
	}
}

// Функция переключения авточтения
function set_auto(state)
{
	if (config.is_auto === state) return;
	if (config.log_level == LOG_ALL) console.log(get_function_name(arguments.callee) + ': ' + state);
	config.is_auto = state;
	let $message_box_next = $('#message_box_next');
	if (config.is_auto)
	{
		if (config.is_skip) set_skip(false);
		$('#message_box_menu_auto').addClass('enabled');
		vn.text_timeout = setTimeout(function()
		{
			$message_box_next.trigger('click');
		}, config.auto_text_pause);
	}
	else
	{
		clearInterval(vn.text_timeout);
		$('#message_box_menu_auto').removeClass('enabled');
	}
}

// Функция переключения проигрывания звуков
function set_sound(state)
{
	if (config.log_level == LOG_ALL) console.log(get_function_name(arguments.callee) + ': ' + state);
	config.is_sound = state;
	$('#sound').prop('muted', !config.is_sound);
	$('#music').prop('muted', !config.is_sound);
	if (config.is_sound)
		$('#message_box_menu_sound').removeClass('disabled');
	else
		$('#message_box_menu_sound').addClass('disabled');
	save_settings();
}

// Вывод модального оповещения
function show_notification(str, delay = 0)
{
	if (config.log_level == LOG_ALL) console.log(get_function_name(arguments.callee));
	$('#modal_box_next').hide();
	$('#modal_box_text').html(str);
	
	$('#modal_screen').stop().fadeIn(config.effect_speed, function()
	{
		if (delay > 0) setTimeout(close_notification, delay);
	});
	return false;
}

// Закрытие модального оповещения
function close_notification(callback)
{
	if (config.log_level == LOG_ALL) console.log(get_function_name(arguments.callee));
	if (callback !== undefined)
		$('#modal_screen').stop().fadeOut(config.effect_speed, function()
		{
			callback();
		});
	else
		$('#modal_screen').stop().fadeOut(config.effect_speed);
}

// Вывод модального оповещения
function show_dialog(str, callback)
{
	if (config.log_level == LOG_ALL) console.log(get_function_name(arguments.callee));
	$('#modal_box_next').show();
	$('#modal_box_text').html(str);
	$('#modal_screen').stop().fadeIn(config.effect_speed, function()
	{
		let $modal_box_next = $('#modal_box_next');
		$(document).on('keydown.dialog', function(e)
		{
			if (e.which === 27) // 'Esc'
				$modal_box_next.trigger('click');
		});
		$modal_box_next.on('click', function()
		{
			$(document).off('keydown.dialog');
			if (callback !== undefined)
				close_notification(callback);
			else
				close_notification();
		});
	});
	return false;
}

// Функция, отображающая главное меню
function create_game_menu()
{
	if (config.log_level == LOG_ALL) console.log(get_function_name(arguments.callee));
	let $background = $('#background');
	let $game_menu = $('#game_menu');
	let $overlay = $('#overlay');
	show_promo();
	if (config.is_skip) set_skip(false);
	if (config.is_auto) set_auto(false);

	$('#game_menu_start').on('click', function()
	{
		set_skip_enabled(config.is_skip_unread);
		$game_menu.find('*').off('click');
		$('#sprites').find('img').remove();
		$('#sound').trigger('pause');
		$('#music').trigger('pause');
		$overlay.stop().fadeOut(config.effect_speed);
		$game_menu.stop().fadeOut(config.effect_speed, function()
		{
			hide_message_box(true);
			vn.drop();
			vn.execute({command: 'jump', params: 'main.scr'});
		});
		return false;
	});

	let $game_menu_cont = $('#game_menu_cont');
	if (vn.is_load(0))
	{
		$game_menu_cont.removeClass('disabled');
		$game_menu_cont.on('click', function()
		{
			set_skip_enabled(config.is_skip_unread);
			$game_menu.find('*').off('click');
			$overlay.stop().fadeOut(config.effect_speed);
			$game_menu.stop().fadeOut(config.effect_speed, function()
			{
				vn.load(0);
			});
			return false;
		});
	}
	else
	{
		$game_menu_cont.addClass('disabled');
		$game_menu_cont.off('click');
	}

	let $game_menu_save = $('#game_menu_save')
	if (vn.game.script_line_num > 0)
	{
		$game_menu_save.removeClass('disabled');
		$game_menu_save.on('click', function()
		{
			$game_menu.find('*').off('click');
			$overlay.stop().fadeOut(config.effect_speed);
			$game_menu.stop().fadeOut(config.effect_speed, function()
			{
				create_save_load_menu(SAVE_MOD, create_game_menu);
			});
			return false;
		});
	}
	else
	{
		$game_menu_save.addClass('disabled');
		$game_menu_save.off('click');
	}

	let $game_menu_load = $('#game_menu_load');
	$game_menu_load.addClass('disabled');
	for (let i = 1; i <= 20; i++)
	{
		if (vn.is_load(i))
		{
			$game_menu_load.removeClass('disabled');
			$game_menu_load.on('click', function()
			{
				set_skip_enabled(config.is_skip_unread);
				$game_menu.find('*').off('click');
				$overlay.stop().fadeOut(config.effect_speed);
				$game_menu.stop().fadeOut(config.effect_speed, function()
				{
					create_save_load_menu(LOAD_MOD, create_game_menu);
				});
				return false;
			});
			break;
		}
	}

	$('#game_menu_config').on('click', function()
	{
		$game_menu.find('*').off('click');
		$overlay.stop().fadeOut(config.effect_speed);
		$game_menu.stop().fadeOut(config.effect_speed, function()
		{
			create_config_menu(create_game_menu);
		});
		return false;
	});

	$('#game_menu_exit').on('click', function()
	{
		$game_menu.find('*').off('click');
		hide_message_box(true, function()
		{
			$('#message_box_next').off('click');
		});
		$('#game_screen').stop().fadeOut(config.effect_speed, function()
		{
			$('#sprites').find('img').remove();
			$('#background').css({'background-image': ''});
			$('#sound').trigger('pause');
			$('#music').trigger('pause');
			vn = undefined;
			create_main_menu();
		});
		return false;
	});

	let filename = vn.game.thumbs.big;
	if ($background.css('background-image') === 'none')
	{
		$.get(filename).done(function()
		{
			$background.css('background-image', 'url(' + filename + ')');
		});
	}
	$overlay.stop().fadeIn(config.effect_speed);
	$game_menu.find('button').fadeIn(config.effect_speed, function()
	{
		$game_menu.fadeIn(config.effect_speed);
	});

}

// Создание списка сохранений
// mod: режим (SAVE_MOD иди LOAD_MOD)
// callback: функция, вызываемая по нажатию кнопки "Вернуться"
function create_save_load_menu(mod, callback)
{
	if (config.log_level == LOG_ALL) console.log(get_function_name(arguments.callee));
	let $save_load_menu = $('#save_load_menu');
	let $overlay = $('#overlay');
	$overlay.stop().fadeTo(config.effect_speed, 1);
	show_promo();
	if (mod)
		$save_load_menu.prepend('<h2>Сохранение</h2>');
	else
		$save_load_menu.prepend('<h2>Загрузка</h2>');
	for (let i = 1; i <= 20; i++)
	{
		let $save_load_menu_div;
		if ((i % 2) === 0)
			$save_load_menu_div = $('#save_load_menu_right');
		else
			$save_load_menu_div = $('#save_load_menu_left');
		let id = 'save_' + i;
		$('<button>')
			.attr('id', id)
			.attr('value', i)
			.appendTo($save_load_menu_div);
		let $id = $('#' + id);
		let load_game = vn.get_load(i);
		if (Boolean(load_game))
		{
			$id.removeClass('center');
			$('<img />')
				.attr('src', vn.game.dir + '/background/' + load_game.bg)
				.appendTo($id);
			$id.append('<div>' + get_file_name(load_game.script_name) + ' <span>[' + load_game.script_line_num + ']</span></div>');
			$id.find('div').css('text-align', 'left');
		}
		else
		{
			$id.append('<div>Свободный слот</div>');
			$id.find('div').css('text-align', 'center');
		}

		$id.on('click', function()
		{
			let selected = parseInt($id.attr('value'), 10);
			$save_load_menu.find('button').off('click');
			$overlay.stop().fadeOut(config.effect_speed);
			$save_load_menu.stop().fadeOut(config.effect_speed, function()
			{
				$save_load_menu.find('button').remove();
				$save_load_menu.find('h2').remove();
				if (mod)
					vn.save(selected);
				else
					vn.load(selected);
			});

			return false;
		});
	}
	$('<button>')
		.attr('id', 'save_load_menu_cancel')
		.append('Отмена')
		.css(
			{
				'width': '230px',
				'text-align': 'center'
			})
		.appendTo($save_load_menu);
	let $save_load_menu_cancel = $('#save_load_menu_cancel');
	$(document).on('keydown.save_load', function(e)
	{
		if (e.which === 27) // 'Esc'
			$save_load_menu_cancel.trigger('click');
	});
	$save_load_menu_cancel.on('click', function()
	{
		$save_load_menu.find('button').off('click');
		$(document).off('keydown.save_load');
		$overlay.stop().fadeOut(config.effect_speed);
		$save_load_menu.stop().fadeOut(config.effect_speed, function()
		{
			$save_load_menu.find('button').remove();
			$save_load_menu.find('h2').remove();
			if (callback !== undefined)
				callback();
		});
	});
	resize_save_load_menu();
	$save_load_menu.find('button').fadeTo(config.effect_speed, 1);
	$save_load_menu.stop().fadeTo(config.effect_speed, 1);
}

// Изменение размеров кнопок меню загрузки и сохранения
function resize_save_load_menu()
{
	let $save_load_menu = $('#save_load_menu');
	if (config.log_level == LOG_ALL) console.log(get_function_name(arguments.callee));
	let button_height = Math.floor(resolution.height / 11) + 2;
	let button_margin = Math.floor(button_height / 3);
	button_height = button_height - button_margin;
	let button_width = Math.floor(resolution.width / 3);
	$save_load_menu.find('button').css({
		'height': button_height + 'px',
		'width': button_width + 'px',
		'margin-top': button_margin / 2 + 'px',
		'margin-bottom': button_margin / 2 + 'px'
	});
	$save_load_menu.find('button').find('div').css({
		'height': (button_height - 6) + 'px',
		'width': button_width + 'px'
	});
	$save_load_menu.find('button').find('img').css('width', (button_height - 5) * (resolution.width / resolution.height) + 'px');
}

// Создание меню настроек
function create_config_menu(callback)
{
	if (config.log_level == LOG_ALL) console.log(get_function_name(arguments.callee));
	let $config_menu = $('#config_menu');
	let $overlay = $('#overlay');
	let $config_menu_text_size = $('#config_menu_text_size');
	let $config_menu_text_speed = $('#config_menu_text_speed');
	let $config_menu_auto_text_pause = $('#config_menu_auto_text_pause');
	let $config_menu_sound_volume = $('#config_menu_sound_volume');
	$config_menu_text_size.val(config.text_size);
	$config_menu_text_speed.val(20 - config.text_speed);
	$config_menu_auto_text_pause.val(config.auto_text_pause / 200);
	$('#config_menu_is_skip_unread').prop('checked', config.is_skip_unread);
	$config_menu_sound_volume.val(config.sound_volume * 10);
	$('#config_menu_is_fullscreen').prop('checked', config.is_fullscreen);
	$('#config_menu_log_' + config.log_level).prop('checked', true);
	$overlay.stop().fadeTo(config.effect_speed, 1);
	$config_menu.stop().fadeTo(config.effect_speed, 1);
	let $config_menu_exit = $('#config_menu_exit');
	$(document).on('keydown.config', function(e)
	{
		if (e.which === 27) // 'Esc'
			$config_menu_exit.trigger('click');
	});
	$config_menu_exit.on('click', function()
	{
		$config_menu.find('button').off('click');
		$(document).off('keydown.config');
		config.text_size = Number($config_menu_text_size.val());
		config.text_speed = Number(20 - $config_menu_text_speed.val());
		config.auto_text_pause = Number($config_menu_auto_text_pause.val() * 200);
		config.is_skip_unread = $('#config_menu_is_skip_unread').prop('checked');
		config.sound_volume = Number($config_menu_sound_volume.val() / 10);
		config.is_fullscreen = $('#config_menu_is_fullscreen').prop('checked');
		config.log_level = $('input[name=log]:checked').val();
		exec_window_resize_events();
		save_settings();
		$overlay.stop().fadeOut(config.effect_speed);
		$config_menu.stop().fadeOut(config.effect_speed, function()
		{
			if (callback !== undefined)
				callback();
		});
	});
}

/*
 * Служебные сервисные функции
 */

// Функция, возвращающая название функции, из которой вызвана
function get_function_name(fn)
{
	return fn.toString().match(/function ([^(]*)\(/)[1] + '()';
}

// Функция, проверяющая, является ли переданная строка шестнадцатеричным числом
function is_hex(str)
{
	if (str === '')
		return false;
	str = str.replace(/^#/, '');
	str = str.replace(/^0+/, '');
	if (str === '')
		return true;
	let hex = parseInt(str, 16);
	return (hex.toString(16) === str.toLowerCase());
}

// Сообщение об ошибке
function show_error(message, delay = 0)
{
	let post_array;
	if (vn)
	{
		message = 'Error at ' + vn.game.script_name + ' line ' + vn.game.script_line_num + '!<br><br>' + message;
		post_array = 
		{
			message: message,
			type: 'Error',
			game_name: vn.game.short_name,
			script_name: vn.game.script_name,
			script_line_num: vn.game.script_line_num
		}
	}
	else
		post_array = 
		{
			message: message,
			type: 'Error'
		}
	
	if (config.is_error_log && is_php_enabled)
		$.post('php/save_log.php', post_array);
	console.error(message.replace(/<br>/g, ' '));
	show_notification(message, delay);
}

// Сообщение о предупреждении
function show_warning(message, callback)
{
	let post_array;
	if (vn)
	{
		message = 'Warning at ' + vn.game.script_name + ' line ' + vn.game.script_line_num + '!<br><br>' + message;
		post_array = 
		{
			message: message,
			type: 'Warning',
			game_name: vn.game.short_name,
			script_name: vn.game.script_name,
			script_line_num: vn.game.script_line_num
		}
	}
	else
		post_array = 
		{
			message: message,
			type: 'Warning'
		}
		
	if (config.is_error_log && is_php_enabled)
		$.post('php/save_log.php', post_array);
	console.warn(message.replace(/<br>/g, ' '));
	if (callback !== undefined)
		show_dialog(message, callback);
	else
		show_dialog(message);
}

// Информационное сообщение
function show_info(message)
{
	show_dialog(message);
}


// Посмотреть список всех глобальных переменных
function show_vars()
{
	let str = '';
	for (let prop in window)
	{
		if (window.hasOwnProperty(prop))
		{
			console.log(prop, window[prop]);
		}
	}
}

// Вывод содержимого объекта
function obj_to_str(obj)
{
	if (typeof(obj) !== 'object')
		return obj;
	let str = '';
	for (k in obj)
		str += k + ': ' + obj[k] + '; ';
	return str;
}

// "Печатающая машинка"
function type_writer(str, text_speed)
{
	let $message_box_name = $('#message_box_name');
	var $message_box_text = $('#message_box_text');
	var message_box_font = $message_box_text.css('font-size') + ' ' + $message_box_text.css('font-family');
	var padding_left = $message_box_text.css('padding-left').replace('px', '');
	var padding_right = $message_box_text.css('padding-right').replace('px', '');
	var message_box_width = $message_box_text.width() - padding_left - padding_right;
	
	clearInterval(type_interval);
	type_interval = undefined;
	let rb_pos = str.indexOf(']');
	if ((str[0] === '[') && (rb_pos > 0) && (rb_pos + 1 < str.length))
	{
		$message_box_name.show();
		let char_name = str.substring(1, rb_pos++).trim();
		$message_box_name.html(char_name);
		str = str.substring(++rb_pos);
		str = '<i>' + str + '</i>';
	}
	else
		$message_box_name.hide();
	if (config.is_skip)
	{
		setTimeout(function()
		{
			$message_box_text.html(str);
		}, config.skip_text_speed);
		return false;
	}
	if (text_speed === 0)
	{
		$message_box_text.html(str);
		return;
	}
	var type_str = '';
	var line_str = '';
	var sub_str = '';
	var i = 0;
	type_interval = setInterval(function()
	{
		if (i < str.length)
		{
			while (str[i] === '&') // Обработка сущностей
			{
				let lt_pos = i;
				let gt_pos = str.indexOf(';', lt_pos) + 1;
				if (gt_pos > 0)
				{
					type_str = str.substr(0, gt_pos);
					i = gt_pos;
				}
			}
			if (str[i] === '<')
			{
				let lt_pos;
				let gt_pos;
				while (str[i] === '<') // Обработка тэгов
				{
					lt_pos = i;
					gt_pos = str.indexOf('>', lt_pos) + 1;
					if (gt_pos > 1)
					{
						type_str = str.substr(0, gt_pos);
						i = gt_pos;
					}
				}
				if (str.substring(lt_pos, gt_pos).toLowerCase() === '<br>')
					line_str = '';
			}
			if (i < str.length)
			{
				type_str += str[i];
				line_str += str[i];
				i++;
				if (str[i - 1] == ' ')
				{
					let next_space = str.indexOf(' ', i) - i;
					if (next_space < 0)
						next_space = str.length;
					sub_str = str.substr(i, next_space);
					if (get_text_width(line_str + sub_str, message_box_font) > message_box_width)
					{
						type_str = type_str.slice(0, -1);
						type_str += '<br>';
						line_str = '';
					}
				}
			}
			$message_box_text.html(type_str);
		}
		else
		{
			clearInterval(type_interval);
			type_interval = undefined;
		}
	}, text_speed);
}

function get_text_width(str, font)
{
	let canvas = get_text_width.canvas || (get_text_width.canvas = document.createElement('canvas'));
	let context = canvas.getContext('2d');
	context.font = font;
	let metrics = context.measureText(str);
	return metrics.width;
}

// Кеширование картинок
function preload_images(images_list)
{
	let func_name = get_function_name(arguments.callee);
	if (config.log_level == LOG_ALL) console.log(func_name);

	$.each(images_list, function(key, value)
	{
		$('<img />')
			.attr('src', value)
			.appendTo('#cache')
			.on('load', function()
			{
				if (config.log_level == LOG_ALL) console.log(func_name + ': ' + value + ' done!');
			});
	});
}

// Удаление первых и последних кавычек из строки
function remove_quotes(str)
{
	let last_char = str.length - 1;
	if (((str[0] === '"') && (str[last_char] === '"'))
	 || ((str[0] === "'") && (str[last_char] === "'")))
		return str.substring(1, last_char);
	else
		return str;
}

// Выполнить javascript-код, содержащийся в строке
function perform_code(code)
{
	return (window.execScript ? execScript(code) : window.eval(code));
}

// Получение имени файла без расширения
function get_file_name(filename)
{
	let delimiter_pos = filename.lastIndexOf('.');
	let str = filename.substr(0, delimiter_pos);
	if ((str.length === 0) || (delimiter_pos === -1))
		return filename;
	else
		return str;
}

// Получение расширения имени файла
function get_file_ext(filename)
{
	let delimiter_pos = filename.lastIndexOf('.') + 1;
	let str = filename.substr(delimiter_pos);
	return str;
}

// Получение времени в миллисекундах
function get_duration(effect_duration)
{
	if (effect_duration === undefined)
		return false;
	effect_duration = effect_duration.toString().toLowerCase();
	if (effect_duration.indexOf('ms') !== -1)
		effect_duration = effect_duration.slice(0, -2); // уже миллисекунды, приводить не надо
	else if (effect_duration.indexOf('s') !== -1)
		effect_duration = effect_duration.slice(0, -1) * 1000; // приводим к миллисекундам
	else
		effect_duration = effect_duration / 0.12; // приводим к 60 fps
	if (!$.isNumeric(effect_duration))
		return false;
	else
		return effect_duration;
}

// Вывод верхнего баннера
function show_promo()
{
	if (is_promo) return;
	let $promo = $('#promo');
	$.get('promo/promo.json')
		.done(function(data)
		{
			let promo;
			if (typeof(data) === 'object')
			{
				let key = Math.floor(Math.random() * data.length);
				promo = data[key];
			}
			else
			{
				promo = JSON.parse(data);
				if (promo.error !== null)
				{
					$promo.hide();
					return false;
				}
			}
			$promo.css('background-image', 'url(promo/' + promo.image);
			$promo.find('a')
				.attr('href', promo.url)
				.on('click', function(e)
				{
					if (is_php_enabled)
					{
						$.post('php/redirect_promo.php',
							{
								name: promo.name,
								url: promo.url,
								image: promo.image
							});
					}
					is_promo = true;
					$(window).off('resize', set_promo_opacity);
					$promo.hide();
				})
				.show(config.effect_speed);
			$(window).on('resize', set_promo_opacity);
			set_promo_opacity();
		})
		.fail(function()
		{
			$promo.hide();
		});

	function set_promo_opacity()
	{
		let $game_screen = $('#game_screen');
		if (($game_screen.is(':visible')) && ($game_screen.position().top < $promo.height()))
		{
			if ($promo.css('opacity') == 1)
				$promo.stop().fadeTo(config.effect_speed, 0.5);
		}
		else
		{
			if ($promo.css('opacity') == 0.5)
				$promo.stop().fadeTo(config.effect_speed, 1);
		}
	}
}

// Эффекты - blur
function filter_blur(obj, strength = 100, duration)
{
	strength = Math.ceil(strength / 10);
	let filter = 'blur(' + strength + 'px)';
	start_filter(obj, filter, duration);
}

// Эффекты - invert
function filter_invert(obj, strength = 100, duration)
{
	let filter = 'invert(' + strength + '%)';
	start_filter(obj, filter, duration);
}

// Эффекты - sepia
function filter_sepia(obj, strength = 100, duration)
{
	let filter = 'sepia(' + strength + '%)';
	start_filter(obj, filter, duration);
}

// Эффекты - saturate
function filter_saturate(obj, strength = 100, duration)
{
	let filter = 'saturate(' + strength + '%)';
	start_filter(obj, filter, duration);
}

// Эффекты - opacity
function filter_opacity(obj, strength = 100, duration)
{
	let filter = 'opacity(' + strength + '%)';
	start_filter(obj, filter, duration);
}

// Эффекты - grayscale
function filter_grayscale(obj, strength = 100, duration)
{
	let filter = 'grayscale(' + strength + '%)';
	start_filter(obj, filter, duration);
}

// Эффекты - h-shake
function effect_hshake($images, strength = 100, duration)
{
	strength = Math.ceil(strength / 20);
	let effect = 'hshake' + strength;
	start_effect($images, effect, duration);
}

// Эффекты - v-shake
function effect_vshake($images, strength = 100, duration)
{
	strength = Math.ceil(strength / 20);
	let effect = 'vshake' + strength;
	start_effect($images, effect, duration);
}

// Начать выполнение эффекта
function start_effect($images, effect, duration)
{
	$images.forEach(function($image)
	{
		$image.css(
		{
			'-webkit-animation': effect + ' infinite linear 0.1s',
			'animation': effect + ' infinite linear 0.1s',
			'transform': 'translate(0, 0)'
		});
		if (duration !== undefined)
		{
			let effect_inteval = setTimeout(function()
			{
				stop_img_effects($image);
				effects_timeouts.splice(effects_timeouts.indexOf(effect_inteval), 1);
			}, duration);
			effects_timeouts.push(effect_inteval);
		}
	});
}

// Сброс всех таймаутов эффектов
function reset_effects_timeouts()
{
	$.each(effects_timeouts, function(key, value)
	{
		clearTimeout(value);
	});
	effects_timeouts = [];
}

// Завершение всех эффектов для спрайта
function stop_all_effects($images)
{
	reset_effects_timeouts();
	$images.forEach(function($image)
	{
		stop_img_effects($image);
	});
}

// Завершение всех эффектов для всех спрайтов
function stop_overall_effects()
{
	reset_effects_timeouts();
	stop_img_effects($('#background'));
	$('#sprites').find('img').each(function()
	{
		stop_img_effects($(this));
	});
}


// Завершение эффекта для конкретного объекта
function stop_img_effects($image)
{
	$image.css(
	{
		'-webkit-animation': '',
		'animation': '',
		'transform': ''
	});
}

// Применение эффекта
function start_filter($images, filter, duration)
{
	let effect_speed = config.effect_speed / 1000;
	$images.forEach(function($image)
	{
		$image.css(
		{
			'-webkit-filter': filter,
			'filter': filter,
			'-webkit-transition': 'filter linear ' + effect_speed + 's',
			'-moz-transition':  'filter linear ' + effect_speed + 's',
			'-o-transition': 'filter linear ' + effect_speed + 's',
			'-ms-transition': 'filter linear ' + effect_speed + 's',
			'transition': 'filter linear ' + effect_speed + 's'
		});
		if (duration !== undefined)
		{
			let filter_inteval = setTimeout(function()
			{
				stop_img_filters($image);
				let pos;
				filters_timeouts.splice(filters_timeouts.indexOf(filter_inteval), 1);
			}, duration);
			filters_timeouts.push(filter_inteval);
		}
	});
}

// Сброс всех таймаутов эффектов
function reset_filters_timeouts()
{
	$.each(filters_timeouts, function(key, value)
	{
		clearTimeout(value);
	});
	filters_timeouts = [];
}

// Завершение всех фильтров для спрайта
function stop_all_filters($images)
{
	reset_filters_timeouts();
	$images.forEach(function($image)
	{
		stop_img_filters($image);
	});
}

// Завершение всех фильтров для всех спрайтов
function stop_overall_filters()
{
	reset_filters_timeouts();
	stop_img_filters($('#background'));
	$('#sprites').find('img').each(function()
	{
		stop_img_filters($(this));
	});
}

// Завершение фильтра для конкретного объекта
function stop_img_filters($image)
{
	let effect_speed = config.effect_speed / 1000;
	$image.css(
	{
		'-webkit-filter': 'none',
		'filter': 'none',
		'-webkit-transition': 'filter linear ' + effect_speed + 's',
		'-moz-transition':  'filter linear ' + effect_speed + 's',
		'-o-transition': 'filter linear ' + effect_speed + 's',
		'-ms-transition': 'filter linear ' + effect_speed + 's',
		'transition': 'filter linear ' + effect_speed + 's'
	});
}

// Завершение всех эффектов и фильтров для всех спрайтов
function stop_overall_effects_filters()
{
	reset_effects_timeouts();
	let $background = $('#background');
	stop_img_effects($background);
	stop_img_filters($background);
	$background
		.stop(true, true)
		.css('prop', $background.css('prop'));
	$('#sprites').find('img').each(function()
	{
		stop_img_effects($(this));
		stop_img_filters($(this));
		$(this)
			.stop(true, true)
			.css('prop', $(this).css('prop'));
	});
}

// Сброс всех таймаутов
function reset_all_timeouts()
{
	var max_timeout_id = setTimeout(';');
	for (let i = 0 ; i < max_timeout_id ; i++)
		clearTimeout(i);
}

// Сброс всех интервалов
function reset_all_intervals()
{
	var max_interval_id = setInterval(';');
	for (let i = 0 ; i < max_interval_id ; i++)
		clearInterval(i);
}
