var moment = require('moment');
require('moment/locale/en-gb');
moment.locale('en-gb', {
	relativeTime: {
		future: "in %s",
		past:   "%s ago",
		s:  "seconds",
		m:  "a minute",
		mm: "%d minutes",
		h:  "an hour",
		hh: "%d hours",
		d:  "a day",
		dd: "%d days",
		M:  "a month",
		MM: "%d months",
		y:  "a year",
		yy: "%d years"
	}
});
