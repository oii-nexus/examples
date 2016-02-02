var oii={};
;(function(undefined) {
	"use strict";
  
	oii.config = function(url, callback) {
		var xhr = sigma.utils.xhr();

		if (!xhr)
			throw 'XMLHttpRequest not supported, cannot load the file.';

		xhr.open('GET', "config.json", true);
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				//do something
				var config=JSON.parse(xhr.responseText);
				console.log(config);
				if (callback) callback(config);
			}
		};
		xhr.send();
	};

}).call(this);
