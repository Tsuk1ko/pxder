module.exports = e => {
	if (typeof e === 'object') {
		if (e.stack) {
			console.error(e.stack);
			delete e.stack;
		}
		console.error('ERROR'.red, JSON.stringify(e, Object.getOwnPropertyNames(e), 4));
	} else console.error('ERROR'.red, e);
};
