var r = new Ractive({
	el: 'container',
	template: '#page',
	data: {
		progress: 0,
		page: 'highlights',
		q: ''
	}
});

$(function() {
    (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
    })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

    ga('create', 'UA-51958038-1', 'joshuasmock.github.io');
    ga('require', 'linkid', 'linkid.js');
    ga('require', 'displayfeatures');
    ga('send', 'pageview');
	
	$('form').on('submit', function(e) {
		return false;
	});
	if (queryString['broadcaster']) {
		r.set('broadcaster', queryString['broadcaster']);
		r.fire('searchBroadcasters');
	}
	r.fire('goto', 'start', r.get('page'));
	//$('#results table').accordionAnimated();

	$.fn.accordionAnimated = function() {
		var
		$accordion = this,
			$items = $accordion.find('> dd'),
			$targets = $items.find('.content'),
			options = {
				active_class: 'active', // class for items when active
				multi_expand: false, // whether mutliple items can expand
				speed: 500, // speed of animation
				toggleable: true // setting to false only closes accordion panels when another is opened
			};

		$.extend(options, Foundation.utils.data_options($accordion));

		$items.each(function(i) {
			$(this).find('a:eq(0)').on('click.accordion', function() {
				if (!options.toggleable && $items.eq(0).hasClass(options.active_class)) {
					return;
				}

				$targets.eq(i)
					.stop(true, true)
					.slideToggle(options.speed);

				if (!options.multi_expand) {
					$targets.not(':eq(' + i + ')')
						.stop(true, true)
						.slideUp(options.speed);
				}
			});
		});
	};
});

r.on('searchBroadcasters', function() {
	r.set('progress', '0%');
	if (r.get('broadcaster') == '') {
		r.set('error', 'Please enter a broadcaster username');
		return;
	}
	
	ga('send', 'event', 'search', r.get('broadcaster'));
	r.set('error', null);
	r.set('searching', true);
	r.set('logo', null)
	t = new $.Deferred();
	if (r.get('a'))
		t = handleTransition('new');
	else
		t = handleTransition('first');
	t.done(function() {
		$.getJSON('https://api.twitch.tv/kraken/channels/' + r.get('broadcaster') + '/?callback=?').done(function(data) {
			r.set({
				'logo': data['logo'],
				'validBroadcaster': true,
				'invalidBroadcaster': false,
				'allVideos': null,
				'videos': null,
				'q': null,
				'yesVideos': false
			});
			retrieveVideos(r.get('broadcaster'), 0, 100).progress(function(percent) {
				r.set('progress', percent + "%");
			}).done(function(videos) {
				if (videos.length > 0) {
					r.set('yesVideos', true);
					r.set('noVideos', false);
					r.set('allVideos', videos);
					r.set('videos', videos);
				} else {
					r.set('error', 'Broadcaster has no videos');
					handleTransition('error');
					return;
				}

				handleTransition('results').done(function() {
					r.set('searching', false);
				});
			});
		}).fail(function() {
			r.set('error', 'Invalid Broadcaster');
			r.set('validBroadcaster', false);
			r.set('searching', false);
			handleTransition('error');
		});
	});
});

r.on('searchVideos', function() {
	// I'm assuming that searching through a hash is faster than searching the DOM in the browser
	if (r.get('q').length < 1) {
		r.set('videos', r.get('allVideos'));
		return;
	}
	sVideos = []
	r.get('allVideos').forEach(function(e) {
		q = r.get('q');
    if(typeof q == 'string')
      q.toLowerCase();
		if (e['title'].toLowerCase().indexOf(q) > -1 || e['description'].toLowerCase().indexOf(q) > -1 || e['game'].toLowerCase().indexOf(q) > -1) {
			sVideos.push(e);
		}
	});
	r.set('videos', sVideos);
	clearTimeout(r.get('searchVideosGA'));
	r.set('searchVideosGA', setTimeout(function() {
		ga('send', 'event', 'search videos', r.get('q')); // only send after videos have populated
	}, 1000));
});

r.on('goto', function(event, template) {
	r.set('page', template);
	if (event == 'start') {
		$('.page[id!="' + template + '"]').each(function(i, e) {
			$(e).hide();
		});
		$('#' + template).show();
	} else {
		ga('send', 'event', 'goto template', template);
		$('.page[id!="' + template + '"]').each(function(i, e) {
			$(e).css('z-index', 1).velocity("slideUp", {
				duration: 500
			})
		});
		$('#' + template).css('z-index', 50).velocity("slideDown", {
			duration: 500
		});
	}
	$('.sub-nav dd').each(function(i, e) {
		$(e).removeClass('active')
	});
	$('.sub-nav dd a[href="#' + template + '"]').parent().addClass('active');
});

function handleTransition(name) {
	// Handles transitions to keep code cleaner
	var t = new $.Deferred();
	switch (name) {
		case 'new':
			a = $('#results').velocity('slideUp', {
				duration: 1200,
				display: 'none'
			}).promise()
			b = $('#q').velocity({
				width: '0%'
			}, {
				duration: 650,
				display: 'none'
			}).promise().done(function() {
				$('#progress_bar').velocity({
					width: '100%'
				}, {
					duration: 750,
					display: 'block'
				})
			}).promise()
			$.when(a, b).done(function() {
				t.resolve();
			});
			break;
		case 'first':
			$('#broadcaster').velocity({
				width: '50%'
			}, 650).promise().done(function() {
				$('#broadcaster').css('width', '100%');
				r.set('a', true);
				$('#progress_bar').velocity({
					width: '100%'
				}, {
					duration: 750,
					display: 'block'
				}).promise().done(function() {
					t.resolve();
				})
			});
			break;
		case 'error':
			t.resolve();
			break;
		case 'results':
			a = $('#progress_bar').delay(100).velocity({
				width: '0%'
			}, {
				duration: 500,
				display: 'none'
			}).promise().done(function() {
				$('#q').velocity({
					width: '100%',
					opacity: 100
				}, {
					duration: 600,
					display: 'block'
				})
			}).promise()
			b = $('#results').velocity("slideDown", {
				duration: r.get('allVideos').length * 15,
				display: 'block'
			}).promise()
			$.when(a, b).done(function() {
				t.resolve();
			});
			break;
	}
	return t;
}

function parseSecs(secs) {
	var hours = parseInt(secs / 3600) % 24;
	var minutes = parseInt(secs / 60) % 60;
	var seconds = secs % 60;

	return (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds);
}

// http://stackoverflow.com/questions/979975/how-to-get-the-value-from-url-parameter
var queryString = function() {
	// This function is anonymous, is executed immediately and 
	// the return value is assigned to QueryString!
	var query_string = {};
	var query = window.location.search.substring(1);
	var vars = query.split("&");
	for (var i = 0; i < vars.length; i++) {
		var pair = vars[i].split("=");
		// If first entry with this name
		if (typeof query_string[pair[0]] === "undefined") {
			query_string[pair[0]] = pair[1];
			// If second entry with this name
		} else if (typeof query_string[pair[0]] === "string") {
			var arr = [query_string[pair[0]], pair[1]];
			query_string[pair[0]] = arr;
			// If third or later entry with this name
		} else {
			query_string[pair[0]].push(pair[1]);
		}
	}
	return query_string;
}();

function retrieveVideos(broadcaster, offset, limit, videos, q) {
	videos = typeof videos == 'undefined' ? [] : videos;
	q = typeof q == 'undefined' ? new $.Deferred() : q;
	getVideoJSON(broadcaster, offset, limit).done(function(data) {

		q.notify((offset + limit) / (Math.ceil(data['_total'] / 100) * 100) * 100);

		if (data['videos'].length == 0 && offset == 0) {
			q.resolve(videos);
		} else if (data['videos'].length == 0) {
			q.resolve(videos);
		}
		data['videos'].forEach(function(e) {
			// Twitch may return nothing for certain values, so cast them to string
			e['title'] == null ? e['title'] = '' : ''
			e['description'] == null ? e['description'] = '' : ''
			e['game'] == null ? e['game'] = '' : ''
			videos.push({
				title: e['title'],
				description: e['description'],
				length: parseSecs(e['length']),
				game: e['game'],
				link: e['url']
			});
		});
		offset += limit;
		if (data['videos'].length < limit) {
			q.resolve(videos);
		} else {
			retrieveVideos(broadcaster, offset, limit, videos, q);
		}
	});
	return q;
}

// Returns a promise to an object

function getVideoJSON(broadcaster, offset, limit) {
	return $.getJSON('https://api.twitch.tv/kraken/channels/' + broadcaster + '/videos?limit=' + limit + '&offset=' + offset + '&broadcasts=false&callback=?').promise();
}
