var levenshtein = require('fast-levenshtein');
var list = require('./product_list.json').products;

var threshold = 2;
var searchWords = process.argv.slice(2).join(' ');
if (!searchWords.length) {
	console.log('\033[31mNo search string was passed.');
	return;
}
console.log('-------------------------------------------------------------------------------------------------------------------------')
console.log(searchWords);
console.log('-------------------------------------------------------------------------------------------------------------------------')
console.time('time')

searchWords = searchWords.replace(/[^A-Za-z&'']/g, ' ').trim().toLowerCase().split(/\s+/);
var results = [];
for (var i = 0; i < searchWords.length; i++) {
	results.push([]);
}
for (var item of list) {
	var targetWords = item.displayName.replace(/[^A-Za-z&']/g, ' ').trim().toLowerCase().split(/\s+/);
	var totalScore = 0;
	var matchCount = 0;
	var matchedStr = '';
	for (var search of searchWords) {
		var min = {
			score: +Infinity,
			index: 0,
			word: '',
		}
		for (var i = 0; i < targetWords.length; i++) {
			var word = targetWords[i];
			var score = scoreStrings(search, word);
			if (score < min.score) {
				min.score = score;
				min.index = i;
				min.word = word;
			}
		}
		if (min.score <= threshold) {
			totalScore += min.score;
			matchedStr += min.word + ' ';
			matchCount++;
			targetWords.splice(min.index, 1);
		}
	}
	var found_item = {
		similarity: totalScore.toFixed(2),
		string: item.displayName,
		match: matchedStr,
	};
	if (matchCount > 0) {
		results[searchWords.length - matchCount].push(found_item);
	}
}
var result = [];
for (var i = 0; i < results.length; i++) {
	if (results[i].length) {
		result = results[i];
		break;
	}
}
result.sort(({similarity: a}, {similarity: b}) => {
	if (a > b) return 1;
	if (a < b) return -1;
	return 0;
})
console.timeEnd('time');
console.log();
for (var res of result) {
	console.log(res.string.padEnd(80, ' '), res.match.padEnd(30, ' '), res.similarity)
}
console.log('\nRESULTS:');
for (var i = 0; i < results.length; i++) {
	console.log('index:', i, 'qty:', results[i].length)
}

function scoreStrings(search, word) {
	var distance = levenshtein.get(search, word);
	var mismatch = search[0] !== word[0];
	var diff = word.length - search.length;
	// short words are treated slightly differently to remove garbage matches
	if (search.length < 5) {
		if (diff === 0) {
			if (mismatch) {
				return distance + 2;
			}
			if (distance < 2) {
				return distance;
			}
			// Improve the score if swapped letters.
			if (distance === 2) {
				var includes_all_letters = search.split('').every(letter => {
					return word.includes(letter);
				});
				if (includes_all_letters) {
					return distance - 1;
				}
			}
			return distance + 1;
		}
		// Lower the score if found word is shorter and differs by more than 1
		if (diff < 0) {
			if (search.startsWith(word) && distance < 2) {
				// Improve if plural
				if (search[search.length - 1] === 's') {
					return 0;
				}
				return distance;
			}
			return distance + 1;
		}
		// No special treatment if found word is longer than search word.
	}
	// Improve score if exact match in longer words:
	// search: apple
	//  found: pineapple
	if (diff > 0 && distance === diff) {
		if (word.startsWith(search)) {
			// Improve score if plural
			if (distance === 1 && word[word.length - 1] === 's') {
				return 0;
			}
			return 1;
		}
		if (word.includes(search)) {
			return 1;
		}
	}
	// Improve score if plural
	if (diff < 0 && distance === 1) {
		if (search.startsWith(word) && search[search.length - 1] === 's') {
			return 0;
		}
	}
	return distance + (mismatch ? 1 : 0);
}
