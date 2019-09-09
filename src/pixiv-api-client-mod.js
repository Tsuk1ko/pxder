/*
https://github.com/alphasp/pixiv-api-client

MIT License

Copyright (c) 2016 alphasp <gmerudotcom@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/* eslint strict:0 */

'use strict';

require('colors');

let axios = require('axios');
const qs = require('qs');
const md5 = require('blueimp-md5');
const Readline = require('readline');
const URL = require('url');

const BASE_URL = 'https://app-api.pixiv.net';
const CLIENT_ID = 'KzEZED7aC0vird8jWyHM38mXjNTY';
const CLIENT_SECRET = 'W9JZoJe00qPvJsiyCGT3CCtC6ZUtdpKpzMbNlUGP';
const HASH_SECRET = '28c1fdd170a5204386cb1313c7077b34f83e4aaf4aa829ce78c231e05b0bae2c';
const filter = 'for_ios';

function callApi(url, options) {
	const finalUrl = /^https?:\/\//i.test(url) ? url : BASE_URL + url;
	return axios(finalUrl, options).then(res => {
		let data = res.data;
		if (data.next_url) {
			let query = qs.parse(URL.parse(data.next_url).query);
			if (query.offset && query.offset >= 5000) delete data.next_url;
		}
		return data;
	}).catch(err => {
		if (err.code == 'ECONNRESET') {
			Readline.clearLine(process.stdout, 0);
			Readline.cursorTo(process.stdout, 0);
			console.error('Connection reset detected.'.gray);
			return callApi(url, options);
		} else {
			let response = err.response;
			delete response.request;
			throw response;
		}
	});
}

class PixivApi {
	constructor() {
		this.headers = {
			'App-OS': 'ios',
			'Accept-Language': 'en-us',
			'App-OS-Version': '12.0.1',
			'App-Version': '7.2.2',
			'User-Agent': 'PixivIOSApp/7.2.2 (iOS 12.0.1; iPhone8,2)'
		};
	}

	static setAgent(agent) {
		axios = require('axios').create({
			httpsAgent: agent
		});
	}

	getDefaultHeaders() {
		const datetime = new Date().toISOString();
		return Object.assign({}, this.headers, {
			'X-Client-Time': datetime,
			'X-Client-Hash': md5(`${datetime}${HASH_SECRET}`),
		});
	}

	getDefaultOptions(data, additionHeaders = {}) {
		return {
			method: 'POST',
			headers: {
				...additionHeaders,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			data,
		};
	}

	login(username, password, rememberPassword) {
		if (!username) {
			return Promise.reject(new Error('username required'));
		}
		if (!password) {
			return Promise.reject(new Error('password required'));
		}
		const data = qs.stringify({
			client_id: CLIENT_ID,
			client_secret: CLIENT_SECRET,
			get_secure_url: 1,
			include_policy: true,
			grant_type: 'password',
			username,
			password,
		});
		const options = this.getDefaultOptions(data, this.getDefaultHeaders());
		return axios('https://oauth.secure.pixiv.net/auth/token', options)
			.then(res => {
				this.auth = res.data.response;
				// eslint-disable-next-line no-unneeded-ternary
				this.rememberPassword = rememberPassword === false ? false : true;
				if (rememberPassword) {
					this.username = username;
					this.password = password;
				}
				return res.data.response;
			});
	}

	logout() {
		this.auth = null;
		this.username = null;
		this.password = null;
		delete this.headers.Authorization;
		return Promise.resolve();
	}

	authInfo() {
		return this.auth;
	}

	refreshAccessToken(refreshToken) {
		if ((!this.auth || !this.auth.refresh_token) && !refreshToken) {
			return Promise.reject(new Error('refresh_token required'));
		}
		const data = qs.stringify({
			client_id: CLIENT_ID,
			client_secret: CLIENT_SECRET,
			get_secure_url: 1,
			grant_type: 'refresh_token',
			refresh_token: refreshToken || this.auth.refresh_token,
		});
		const options = this.getDefaultOptions(data, this.getDefaultHeaders());
		return axios('https://oauth.secure.pixiv.net/auth/token', options)
			.then(res => {
				this.auth = res.data.response;
				return res.data.response;
			});
	}

	// eslint-disable-next-line class-methods-use-this
	createProvisionalAccount(nickname) {
		if (!nickname) {
			return Promise.reject(new Error('nickname required'));
		}
		const data = qs.stringify({
			ref: 'pixiv_ios_app_provisional_account',
			user_name: nickname,
		});

		const options = this.getDefaultOptions(data, {
			Authorization: 'Bearer WHDWCGnwWA2C8PRfQSdXJxjXp0G6ULRaRkkd6t5B6h8',
		});
		return axios(
				'https://accounts.pixiv.net/api/provisional-accounts/create',
				options
			)
			.then(res => res.data.body);
	}

	// require auth
	userState() {
		return this.requestUrl(`/v1/user/me/state`);
	}

	editUserAccount(fields) {
		if (!fields) {
			return Promise.reject(new Error('fields required'));
		}

		const data = qs.stringify({
			current_password: fields.currentPassword,
			new_user_account: fields.pixivId, // changeable once per account
			new_password: fields.newPassword, // required if current account is provisional
			new_mail_address: fields.email,
		}, {
			skipNulls: true
		});
		const options = this.getDefaultOptions(data);

		return this.requestUrl(
			'https://accounts.pixiv.net/api/account/edit',
			options
		);
	}

	sendAccountVerificationEmail() {
		const options = {
			method: 'POST',
		};
		return this.requestUrl('/v1/mail-authentication/send', options);
	}

	searchIllust(word, options) {
		if (!word) {
			return Promise.reject(new Error('word required'));
		}

		const queryString = qs.stringify(
			Object.assign({
					word,
					search_target: 'partial_match_for_tags',
					sort: 'date_desc',
					filter,
				},
				options
			)
		);
		return this.requestUrl(`/v1/search/illust?${queryString}`);
	}

	searchIllustPopularPreview(word, options) {
		if (!word) {
			return Promise.reject(new Error('word required'));
		}

		const queryString = qs.stringify(
			Object.assign({
					word,
					search_target: 'partial_match_for_tags',
					filter,
				},
				options
			)
		);
		return this.requestUrl(`/v1/search/popular-preview/illust?${queryString}`);
	}

	searchNovel(word, options) {
		if (!word) {
			return Promise.reject(new Error('word required'));
		}

		const queryString = qs.stringify(
			Object.assign({
					word,
					search_target: 'partial_match_for_tags',
					sort: 'date_desc',
					filter,
				},
				options
			)
		);
		return this.requestUrl(`/v1/search/novel?${queryString}`);
	}

	searchNovelPopularPreview(word, options) {
		if (!word) {
			return Promise.reject(new Error('word required'));
		}

		const queryString = qs.stringify(
			Object.assign({
					word,
					search_target: 'partial_match_for_tags',
					filter,
				},
				options
			)
		);
		return this.requestUrl(`/v1/search/popular-preview/novel?${queryString}`);
	}

	searchIllustBookmarkRanges(word, options) {
		if (!word) {
			return Promise.reject('word required');
		}
		const queryString = qs.stringify(
			Object.assign({
					word,
					search_target: 'partial_match_for_tags',
					filter,
				},
				options
			)
		);
		return this.requestUrl(`/v1/search/bookmark-ranges/illust?${queryString}`);
	}

	searchNovelBookmarkRanges(word, options) {
		if (!word) {
			return Promise.reject('word required');
		}
		const queryString = qs.stringify(
			Object.assign({
					word,
					search_target: 'partial_match_for_tags',
					filter,
				},
				options
			)
		);
		return this.requestUrl(`/v1/search/bookmark-ranges/novel?${queryString}`);
	}

	searchUser(word) {
		if (!word) {
			return Promise.reject(new Error('word required'));
		}
		const queryString = qs.stringify(
			Object.assign({
				word,
				filter,
			})
		);
		return this.requestUrl(`/v1/search/user?${queryString}`);
	}

	searchAutoComplete(word) {
		if (!word) {
			return Promise.reject('word required');
		}
		const queryString = qs.stringify(
			Object.assign({
				word,
			})
		);
		return this.requestUrl(`/v1/search/autocomplete?${queryString}`);
	}

	userDetail(id, options) {
		if (!id) {
			return Promise.reject(new Error('user_id required'));
		}

		const queryString = qs.stringify(
			Object.assign({
					user_id: id,
					filter,
				},
				options
			)
		);
		return this.requestUrl(`/v1/user/detail?${queryString}`);
	}

	userIllusts(id, options) {
		if (!id) {
			return Promise.reject(new Error('user_id required'));
		}

		const queryString = qs.stringify(
			Object.assign({
					user_id: id,
					filter,
				},
				options
			)
		);
		return this.requestUrl(`/v1/user/illusts?${queryString}`);
	}

	userNovels(id, options) {
		if (!id) {
			return Promise.reject(new Error('user_id required'));
		}

		const queryString = qs.stringify(
			Object.assign({
					user_id: id,
					filter,
				},
				options
			)
		);
		return this.requestUrl(`/v1/user/novels?${queryString}`);
	}

	userBookmarksIllust(id, options) {
		if (!id) {
			return Promise.reject(new Error('user_id required'));
		}

		const queryString = qs.stringify(
			Object.assign({
					user_id: id,
					restrict: 'public',
					filter,
				},
				options
			)
		);
		return this.requestUrl(`/v1/user/bookmarks/illust?${queryString}`);
	}

	userBookmarkIllustTags(options) {
		const queryString = qs.stringify(
			Object.assign({
					restrict: 'public',
				},
				options
			)
		);
		return this.requestUrl(`/v1/user/bookmark-tags/illust?${queryString}`);
	}

	illustBookmarkDetail(id, options) {
		if (!id) {
			return Promise.reject(new Error('illust_id required'));
		}

		const queryString = qs.stringify(
			Object.assign({
					illust_id: id,
				},
				options
			)
		);
		return this.requestUrl(`/v2/illust/bookmark/detail?${queryString}`);
	}

	userBookmarksNovel(id, options) {
		if (!id) {
			return Promise.reject(new Error('user_id required'));
		}

		const queryString = qs.stringify(
			Object.assign({
					user_id: id,
					restrict: 'public',
					filter,
				},
				options
			)
		);
		return this.requestUrl(`/v1/user/bookmarks/novel?${queryString}`);
	}

	userBookmarkNovelTags(options) {
		const queryString = qs.stringify(
			Object.assign({
					restrict: 'public',
				},
				options
			)
		);
		return this.requestUrl(`/v1/user/bookmark-tags/novel?${queryString}`);
	}

	illustWalkthrough() {
		return this.requestUrl(`/v1/walkthrough/illusts`);
	}

	illustComments(id, options) {
		if (!id) {
			return Promise.reject(new Error('illust_id required'));
		}

		const queryString = qs.stringify(
			Object.assign({
					illust_id: id,
					include_total_comments: true,
				},
				options
			)
		);
		return this.requestUrl(`/v1/illust/comments?${queryString}`);
	}

	illustCommentsV2(id, options) {
		if (!id) {
			return Promise.reject(new Error('illust_id required'));
		}

		const queryString = qs.stringify(
			Object.assign({
					illust_id: id,
				},
				options
			)
		);
		return this.requestUrl(`/v2/illust/comments?${queryString}`);
	}

	illustCommentReplies(id) {
		if (!id) {
			return Promise.reject(new Error('comment_id required'));
		}
		const queryString = qs.stringify({
			comment_id: id
		});
		return this.requestUrl(`/v1/illust/comment/replies?${queryString}`);
	}

	illustRelated(id, options) {
		if (!id) {
			return Promise.reject(new Error('illust_id required'));
		}

		const queryString = qs.stringify(
			Object.assign({
					illust_id: id,
					filter,
				},
				options
			)
		);
		return this.requestUrl(`/v2/illust/related?${queryString}`);
	}

	illustDetail(id, options) {
		if (!id) {
			return Promise.reject(new Error('illust_id required'));
		}

		const queryString = qs.stringify(
			Object.assign({
					illust_id: id,
					filter,
				},
				options
			)
		);
		return this.requestUrl(`/v1/illust/detail?${queryString}`);
	}

	illustNew(options) {
		const queryString = qs.stringify(
			Object.assign({
					content_type: 'illust',
					filter,
				},
				options
			)
		);
		return this.requestUrl(`/v1/illust/new?${queryString}`);
	}

	illustFollow(options) {
		const queryString = qs.stringify(
			Object.assign({
					restrict: 'all',
				},
				options
			)
		);
		return this.requestUrl(`/v2/illust/follow?${queryString}`);
	}

	illustRecommended(options) {
		const queryString = qs.stringify(
			Object.assign({
					include_ranking_illusts: true,
					filter,
				},
				options
			)
		);
		return this.requestUrl(`/v1/illust/recommended?${queryString}`);
	}

	illustRanking(options) {
		const queryString = qs.stringify(
			Object.assign({
					mode: 'day',
					filter,
				},
				options
			)
		);
		return this.requestUrl(`/v1/illust/ranking?${queryString}`);
	}

	illustMyPixiv() {
		return this.requestUrl('/v2/illust/mypixiv');
	}

	illustAddComment(id, comment, parentCommentId) {
		if (!id) {
			return Promise.reject(new Error('illust_id required'));
		}
		if (!comment) {
			return Promise.reject(new Error('comment required'));
		}
		const data = qs.stringify({
			illust_id: id,
			comment,
			parent_comment_id: parentCommentId,
		});
		const options = this.getDefaultOptions(data);
		return this.requestUrl(`/v1/illust/comment/add`, options);
	}

	novelAddComment(id, comment, parentCommentId) {
		if (!id) {
			return Promise.reject(new Error('novel_id required'));
		}
		if (!comment) {
			return Promise.reject(new Error('comment required'));
		}
		const data = qs.stringify({
			novel_id: id,
			comment,
			parent_comment_id: parentCommentId,
		});
		const options = this.getDefaultOptions(data);
		return this.requestUrl(`/v1/novel/comment/add`, options);
	}

	trendingTagsIllust(options) {
		const queryString = qs.stringify(
			Object.assign({
					filter,
				},
				options
			)
		);
		return this.requestUrl(`/v1/trending-tags/illust?${queryString}`);
	}

	trendingTagsNovel(options) {
		const queryString = qs.stringify(
			Object.assign({
					filter,
				},
				options
			)
		);
		return this.requestUrl(`/v1/trending-tags/novel?${queryString}`);
	}

	bookmarkIllust(id, restrict, tags) {
		if (!id) {
			return Promise.reject(new Error('illust_id required'));
		}
		if (restrict && ['public', 'private'].indexOf(restrict) === -1) {
			return Promise.reject(new Error('invalid restrict value'));
		}
		if (tags && !Array.isArray(tags)) {
			return Promise.reject(new Error('invalid tags value'));
		}
		const data = qs.stringify({
			illust_id: id,
			restrict: restrict || 'public',
			tags: tags && tags.length ? tags : undefined,
		});
		const options = this.getDefaultOptions(data);
		return this.requestUrl('/v2/illust/bookmark/add', options);
	}

	unbookmarkIllust(id) {
		if (!id) {
			return Promise.reject(new Error('illust_id required'));
		}
		const data = qs.stringify({
			illust_id: id,
		});
		const options = this.getDefaultOptions(data);
		return this.requestUrl('/v1/illust/bookmark/delete', options);
	}

	bookmarkNovel(id, restrict, tags) {
		if (!id) {
			return Promise.reject(new Error('novel_id required'));
		}
		if (restrict && ['public', 'private'].indexOf(restrict) === -1) {
			return Promise.reject(new Error('invalid restrict value'));
		}
		if (tags && !Array.isArray(tags)) {
			return Promise.reject(new Error('invalid tags value'));
		}
		const data = qs.stringify({
			novel_id: id,
			restrict: restrict || 'public',
			tags: tags && tags.length ? tags : undefined,
		});
		const options = this.getDefaultOptions(data);
		return this.requestUrl('/v2/novel/bookmark/add', options);
	}

	unbookmarkNovel(id) {
		if (!id) {
			return Promise.reject(new Error('novel_id required'));
		}
		const data = qs.stringify({
			novel_id: id,
		});
		const options = this.getDefaultOptions(data);
		return this.requestUrl('/v1/novel/bookmark/delete', options);
	}

	followUser(id, restrict) {
		if (!id) {
			return Promise.reject(new Error('user_id required'));
		}
		if (restrict && ['public', 'private'].indexOf(restrict) === -1) {
			return Promise.reject(new Error('invalid restrict value'));
		}
		const data = qs.stringify({
			user_id: id,
			restrict: restrict || 'public',
		});
		const options = this.getDefaultOptions(data);
		return this.requestUrl('/v1/user/follow/add', options);
	}

	unfollowUser(id) {
		if (!id) {
			return Promise.reject(new Error('user_id required'));
		}
		const data = qs.stringify({
			user_id: id,
			restrict: 'public',
		});
		const options = this.getDefaultOptions(data);
		return this.requestUrl('/v1/user/follow/delete', options);
	}

	mangaRecommended(options) {
		const queryString = qs.stringify(
			Object.assign({
					include_ranking_label: true,
					filter,
				},
				options
			)
		);
		return this.requestUrl(`/v1/manga/recommended?${queryString}`);
	}

	mangaNew(options) {
		const queryString = qs.stringify(
			Object.assign({
					content_type: 'manga',
					filter,
				},
				options
			)
		);
		return this.requestUrl(`/v1/illust/new?${queryString}`);
	}

	novelRecommended(options) {
		const queryString = qs.stringify(
			Object.assign({
					include_ranking_novels: true,
					filter,
				},
				options
			)
		);
		return this.requestUrl(`/v1/novel/recommended?${queryString}`);
	}

	novelNew(options) {
		const queryString = qs.stringify(options);
		return this.requestUrl(`/v1/novel/new?${queryString}`);
	}

	novelComments(id, options) {
		if (!id) {
			return Promise.reject(new Error('novel_id required'));
		}

		const queryString = qs.stringify(
			Object.assign({
					novel_id: id,
					include_total_comments: true,
				},
				options
			)
		);
		return this.requestUrl(`/v1/novel/comments?${queryString}`);
	}

	novelCommentsV2(id, options) {
		if (!id) {
			return Promise.reject(new Error('novel_id required'));
		}

		const queryString = qs.stringify(
			Object.assign({
					novel_id: id,
				},
				options
			)
		);
		return this.requestUrl(`/v2/novel/comments?${queryString}`);
	}

	novelCommentReplies(id) {
		if (!id) {
			return Promise.reject(new Error('comment_id required'));
		}
		const queryString = qs.stringify({
			comment_id: id
		});
		return this.requestUrl(`/v1/novel/comment/replies?${queryString}`);
	}

	novelSeries(id) {
		if (!id) {
			return Promise.reject(new Error('series_id required'));
		}

		const queryString = qs.stringify({
			series_id: id
		});
		return this.requestUrl(`/v1/novel/series?${queryString}`);
	}

	novelDetail(id) {
		if (!id) {
			return Promise.reject(new Error('novel_id required'));
		}

		const queryString = qs.stringify({
			novel_id: id
		});
		return this.requestUrl(`/v2/novel/detail?${queryString}`);
	}

	novelText(id) {
		if (!id) {
			return Promise.reject(new Error('novel_id required'));
		}

		const queryString = qs.stringify({
			novel_id: id
		});
		return this.requestUrl(`/v1/novel/text?${queryString}`);
	}

	novelFollow(options) {
		const queryString = qs.stringify(
			Object.assign({
					restrict: 'all',
				},
				options
			)
		);
		return this.requestUrl(`/v1/novel/follow?${queryString}`);
	}

	novelMyPixiv() {
		return this.requestUrl('/v1/novel/mypixiv');
	}

	novelRanking(options) {
		const queryString = qs.stringify(
			Object.assign({
					mode: 'day',
				},
				options
			)
		);
		return this.requestUrl(`/v1/novel/ranking?${queryString}`);
	}

	novelBookmarkDetail(id, options) {
		if (!id) {
			return Promise.reject(new Error('novel_id required'));
		}

		const queryString = qs.stringify(
			Object.assign({
					novel_id: id,
				},
				options
			)
		);
		return this.requestUrl(`/v2/novel/bookmark/detail?${queryString}`);
	}

	userRecommended(options) {
		const queryString = qs.stringify(
			Object.assign({
					filter,
				},
				options
			)
		);
		return this.requestUrl(`/v1/user/recommended?${queryString}`);
	}

	userFollowing(id, options) {
		if (!id) {
			return Promise.reject('user_id required');
		}
		const queryString = qs.stringify(
			Object.assign({
					user_id: id,
					restrict: 'public',
				},
				options
			)
		);
		return this.requestUrl(`/v1/user/following?${queryString}`);
	}

	userFollowDetail(id) {
		if (!id) {
			return Promise.reject('user_id required');
		}
		const queryString = qs.stringify({
			user_id: id
		});
		return this.requestUrl(`/v1/user/follow/detail?${queryString}`);
	}

	userFollower(id, options) {
		if (!id) {
			return Promise.reject('user_id required');
		}
		const queryString = qs.stringify(
			Object.assign({
					user_id: id,
					filter,
				},
				options
			)
		);
		return this.requestUrl(`/v1/user/follower?${queryString}`);
	}

	userMyPixiv(id) {
		if (!id) {
			return Promise.reject('user_id required');
		}
		const queryString = qs.stringify({
			user_id: id
		});
		return this.requestUrl(`/v1/user/mypixiv?${queryString}`);
	}

	ugoiraMetaData(id) {
		if (!id) {
			return Promise.reject('illust_id required');
		}
		const queryString = qs.stringify({
			illust_id: id
		});
		return this.requestUrl(`/v1/ugoira/metadata?${queryString}`);
	}

	setLanguage(lang) {
		this.headers['Accept-Language'] = lang;
	}

	requestUrl(url, options) {
		if (!url) {
			return Promise.reject('Url cannot be empty');
		}
		options = options || {};
		options.headers = Object.assign(this.getDefaultHeaders(), options.headers || {});
		if (this.auth && this.auth.access_token) {
			options.headers.Authorization = `Bearer ${this.auth.access_token}`;
		}
		return callApi(url, options).then(json => json);
	}
}

module.exports = PixivApi;
