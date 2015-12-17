var vlrc = {
	player: document.getElementById('player'),
	name: $('#console-song-name'),
	src: '',
	button: {
		play: $('#console-play'),
		pause: $('#console-pause')
	},
	current: document.getElementById('console-currentTime'),
	duration: document.getElementById('console-duration'),
	progress: {
		bar: $(''),
		intervalId: 0
	},
	lrc: [],
	// match => ([dd+:dd(.dd)]|).*
	lrcExp: /^(\[(\d{2,})\:(\d{2})(\.(\d{2})|)\]|)(.*)$/
}

/* Drag Music In */
function stopEvent(e){e.stopPropagation();e.preventDefault()}
document.addEventListener('dragenter', stopEvent)
document.addEventListener('dragover', stopEvent)
document.addEventListener('drop', function(e){
	stopEvent(e)
	
	;[].forEach.call(e.dataTransfer.files, function (file){
		var reader = new FileReader()
		if(file.type.match(/audio*/)){
			URL.revokeObjectURL(vlrc.src)
			vlrc.player.src = vlrc.src = URL.createObjectURL(file)
			
			vlrc.name.text(file.name)
			updateTime()
			vlrc.button.pause.click()
		} else {
			reader.readAsText(file)
			reader.onloadend = function (res){
				$('#raw-lrc').val(res.currentTarget.result)
			}
		}
	})
})

/* Button Logic */
vlrc.button.play.click(function (){
	vlrc.button.play .hide()
	vlrc.button.pause.show()
	vlrc.player      .play()
}).click(vlrc.name.show.bind(vlrc.name)).click(startProgress)

function pause(){
	vlrc.button.pause.hide()
	vlrc.button.play .show()
	vlrc.player      .pause()
	clearInterval(vlrc.progress.intervalId)
}
vlrc.button.pause.click(pause)

$('#console-back').click(function (){vlrc.player.currentTime -= 5;updateTime()})
$('#console-go')  .click(function (){vlrc.player.currentTime += 5;updateTime()})

/* Time Update && Progress Update */
function updateTime(){
	vlrc.current .innerHTML = formatTime(getSongTime())
	vlrc.duration.innerHTML = formatTime(getSongTime(vlrc.player.duration))
	vlrc.progress.bar.width(vlrc.player.currentTime / vlrc.player.duration * 100 + '%')
	previewUpdater(vlrc.player.currentTime)
}
function startProgress(){
	vlrc.progress.bar = $('#progress .progressbar')
	vlrc.progress.intervalId = setInterval(updateTime, 0)
}

/* Editor Logic */
$("#editor-tab").click(function () {
	var t = $('#lrc-editor tbody')
	t.html('')
	
	vlrc.lrc = $('#raw-lrc').val().split('\n').map(function (raw, index){
		var lrc = new Lrc(raw.match(vlrc.lrcExp))
		$('<tr data-index="' + index + '"><td class="vlrc-editor-time">' + formatTime(lrc) + '</td><td>' + lrc.text + '</td></tr>').click(function (){
			var dom = $(this)
			var index = dom.attr('data-index')
			var now = getSongTime()
			
			vlrc.lrc[index].min = now.min
			vlrc.lrc[index].sec = now.sec
			vlrc.lrc[index].ms = now.ms
			dom.find('.vlrc-editor-time').html(formatTime(now))
		}).appendTo(t)
		return lrc
	})
})
// Regexp Match => Lrc{min, sec, ms, timed, text}
function Lrc(match){
	this.min = parseInt(match[2]) || 0
	this.sec = parseInt(match[3]) || 0
	this.ms = parseInt(match[5]) || 0
	this.text = match[6]
	this.rawTime = this.min * 60 + this.sec + this.ms / 100
}

// *Float => {min, sec, ms}
function getSongTime(x){
	var rawTime = x || vlrc.player.currentTime
	
	var mins = 0
	var secs = parseInt(rawTime)
	var ms = parseInt((rawTime - secs) * 100)
	while(secs >= 60) secs -= 60, mins ++
	return {
		min: mins, sec: secs, ms: ms
	}
}
// {min, sec, ms} => min:sec.ms
function formatTime(obj){
	function num(n){return n === undefined ? 0 : (parseInt(n) || 0)}
	var arr = [num(obj.min), num(obj.sec), num(obj.ms)]
	var m = arr[0] >= 10 ? arr[0] : '0' + arr[0]
	var s = arr[1] >= 10 ? arr[1] : '0' + arr[1]
	var ms = arr[2] >= 10 ? arr[2] : '0' + arr[2]
	return m + ':' + s + (ms ? '.' + ms : '')
}

/* Raw Logic */
$("#raw-tab").click(function () {
	$('#raw-lrc').val(vlrc.lrc.map(function (v){
		return '[' + formatTime(v) + ']' + v.text
	}).join('\n'))
})

/* Menu Logic */
function outSource(){
	var res = prompt("Url of music / 外链地址")
	if(res) vlrc.name.text(""), vlrc.player.src = res
	else return false
}
vlrc.player.onended = pause

/* Preview Logic*/
$("#preview-tab").click(function (){
	if(vlrc.lrc.length === 0) $("#editor-tab").click(), $("#preview-tab").click()
	var t = $('#lrc-preview tbody')
	t.html('')
	
	function getNextTime(index){
		return index == vlrc.lrc.length ? vlrc.player.duration : vlrc.lrc[index += 1].rawTime || getNextTime(index)
	}	
	vlrc.lrc.forEach(function (lrc, index){
		var time = lrc.rawTime
		var next = getNextTime(index)
		var dur = next - time
		if(dur < 0) dur = 0
		console.log(time, next)

		$('<tr data-start="' + time + '" data-dur="' + (lrc.text ? dur : 0) +'"><td>' + lrc.text + '</td></tr>').appendTo(t).click(function (){
			vlrc.player.currentTime = parseFloat($(this).attr('data-start'))
		})
	})
})
function previewUpdater(t){
	$('#lrc-preview tbody tr').each(function (i, v){
		var dom = $(this)
		var start = parseFloat(dom.attr('data-start'))
		var dur = parseFloat(dom.attr('data-dur'))
		if(t > start && t < start + dur) dom.addClass('active')
		else dom.removeClass('active')
	})
}