Spotify = function (root) {
    var Spotify = function () {
        this.initialize.apply(this, arguments);
    };

    _.extend(Spotify, {
        Endpoint: {
            ACCOUNTS: "accounts",
            API: "api"
        },

        Request: {
            GET: "GET",
            POST: "POST"
        }
    });

    _.extend(Spotify.prototype, {
        initialize: function () {
            this.options = {
                endpoints: {
                    "accounts": "https://accounts.spotify.com",
                    "api": "https://api.spotify.com/v1"
                }
            };

            this.Playlists = new Spotify.Playlists(this);
            this.Authorization = new Spotify.Authorization(this);
            this.Profiles = new Spotify.Profiles(this);
            this.Tracks = new Spotify.Tracks(this);
        },

        setup: function (options) {
            this.options = _.extend(this.options, options);
        },

        setAccessToken: function (token) {
            localStorage.setItem("spotify_token", JSON.stringify({
                access_token: token
            }));
        },

        request: function (request, callback) {
            request = _.defaults(_.clone(request), {
                method: Spotify.Request.GET,
                endpoint: Spotify.Endpoint.API,
                authorized: true,
                query: {},
                data: {},
                output: [],
                paged: false
            });

            var url;
            if (request.url.toLowerCase().indexOf("http") == 0) {
                url = request.url;
            } else {
                url = this.options.endpoints[request.endpoint] + request.url;
            }

            var params = _.compact(_.flatten(_.map(request.query, function (value, key) {
                if (_.isUndefined(value)) {
                    return null;
                } else if (_.isArray(value)) {
                    if (!!request.commas) {
                        return { name: key, value: value };
                    } else {
                        return _.map(value, function (v) {
                            return { name: key, value: v };
                        });
                    }
                } else {
                    return { name: key, value: value };
                }
            })));

            if (params.length > 0) {
                url += "?" + $.param(params);
            }

            var headers = {};
            if (request.authorized) {
                var accessToken = this.Authorization.getAccessToken();
                if (!accessToken) {
                    async.nextTick(function () {
                        callback("Missing access token");
                    });
                    return;
                }

                headers['Authorization'] = "Bearer " + accessToken;
            }

            $.ajax(url, {
                method: request.method,
                headers: headers,
                data: request.data
            }).fail(_.bind(function (jqXHR, textStatus, errorThrown) {
                switch (jqXHR.status.toString()) {
                    case "401": {
                        if (!request.authorized) {
                            callback(textStatus);
                            return;
                        }

                        this.Authorization.refresh(_.bind(function (err) {
                            if (err) {
                                callback(err);
                                return;
                            }

                            this.request(request, callback);
                        }, this));
                    } break;

                    case "429": {
                        var retries = request.hasOwnProperty("_retries") ? request._retries : 0;
                        if (retries > 2) {
                            callback(textStatus);
                            return;
                        }

                        request._retries = retries + 1;
                        setTimeout(_.bind(function () {
                            this.request(request, callback);
                        }, this), (retries + 1) * 2500 + Math.random() * 2500);
                    } break;

                    default: {
                        callback(textStatus);
                    } break;
                }
            }, this)).done(_.bind(function (data, textStatus, jqXHR) {
                if (!request.paged) {
                    callback(null, data);
                    return;
                }

                request.output.push.apply(request.output, data.items);

                if (data.next) {
                    var newRequest = {
                        url: data.next,
                        paged: request.paged,
                        output: request.output,
                        cache: request.cache
                    };

                    this.request(newRequest, callback);
                } else {
                    callback(null, request.output);
                }
            }, this));
        },

        connect: function (callback) {
            var accessToken = this.Authorization.getAccessToken();
            if (accessToken) {
                this.Profiles.me(_.bind(function (err, profile) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    this.user = profile;
                    callback(null, profile);
                }, this));
                return;
            }

            callback(null, null);
        },

        disconnect: function () {
            this.Authorization.reset();
            delete this.user;
        }
    });

    Spotify.Playlists = function (client) {
        this.client = client;
    };

    _.extend(Spotify.Playlists.prototype, {
        playlists: function (user, callback) {
            if (_.isUndefined(callback)) {
                callback = user;
                user = this.client.user.id;
            }

            this.client.request({
                url: "/users/" + user + "/playlists",
                cache: "playlists:" + user,
                paged: true,
                query: {
                    limit: 50
                }
            }, function (err, playlists) {
                callback(err, playlists);
            });
        },

        playlist: function (user, playlist, callback) {
            if (_.isUndefined(callback)) {
                callback = playlist;
                playlist = user;
                user = this.client.user.id;
            }

            this.client.request({
                url: "/users/" + user + "/playlists/" + playlist,
                cache: "playlist:" + user + ":" + playlist
            }, function (err, playlist) {
                callback(err, playlist);
            });
        },

        tracks: function () {
            var fields, user, playlist, callback;

            switch (arguments.length) {
                case 2: {
                    fields = undefined;
                    user = this.client.user.id;
                    playlist = arguments[0];
                    callback = arguments[1];
                } break;

                case 3: {
                    fields = undefined;
                    user = arguments[0];
                    playlist = arguments[1];
                    callback = arguments[2];
                } break;

                case 4: {
                    fields = arguments[0];
                    user = arguments[1];
                    playlist = arguments[2];
                    callback = arguments[3];
                } break;
            }

            this.client.request({
                url: "/users/" + user + "/playlists/" + playlist + "/tracks",
                cache: "playlist:" + user + ":" + playlist + ":tracks",
                paged: true,

                query: {
                    fields: fields,
                    limit: 100
                }
            }, function (err, tracks) {
                callback(err, tracks);
            });
        }
    });

    Spotify.Tracks = function (client) {
        this.client = client;
    };

    _.extend(Spotify.Tracks.prototype, {
        audioFeatures: function (ids, callback) {
            this.client.request({
                url: "/audio-features",
                query: {
                    ids: ids
                },
                commas: true
            }, function (err, features) {
                callback(err, features);
            });
        }
    });

    Spotify.Authorization = function (client) {
        this.client = client;
    };

    _.extend(Spotify.Authorization.prototype, {
        getAccessToken: function () {
            var token = JSON.parse(localStorage.getItem("spotify_token")) || {};
            if (!token) {
                return null;
            }

            return token.access_token;
        },

        reset: function () {
            root.localStorage.removeItem("access_token");
            root.localStorage.removeItem("refresh_token");
        },

        authorize: function (scopes) {
            var url = this.client.options.endpoints[Spotify.Endpoint.ACCOUNTS] + "/authorize?";

            if (!this.client.options.client_id) {
                return;
            }

            url += $.param({
                client_id: this.client.options.client_id,
                response_type: "token",
                redirect_uri: this.client.options.redirect_uri,
                scope: scopes.join(" ")
            });

            window.location = url;
        },

        code: function (code, callback) {
            if (!this.client.options.client_id) {
                async.nextTick(function () {
                    callback("no client");
                });
                return;
            }

            this.client.request({
                url: "/api/token",
                endpoint: Spotify.Endpoint.ACCOUNTS,
                method: Spotify.Request.POST,
                authorized: false,

                data: {
                    client_id: this.client.options.client_id,
                    client_secret: this.client.options.client_secret,

                    grant_type: "authorization_code",
                    code: code,
                    redirect_uri: this.client.options.redirect_uri
                }
            }, function (err, data) {
                if (err) {
                    callback(err);
                    return;
                }

                localStorage.setItem("spotify_token", JSON.stringify(data));

                callback(null);
            });
        },

        refresh: function (callback) {
            var token = JSON.parse(localStorage.getItem("spotify_token")) || {};

            if (!token.hasOwnProperty("refresh_token")) {
                async.nextTick(function () {
                    callback("refresh_token");
                });
                return;
            }

            this.client.request({
                url: "/api/token",
                endpoint: Spotify.Endpoint.ACCOUNTS,
                method: Spotify.Request.POST,
                authorized: false,

                data: {
                    client_id: this.client.options.client_id,
                    client_secret: this.client.options.client_secret,

                    grant_type: "refresh_token",
                    refresh_token: token.refresh_token
                }
            }, function (err, data) {
                if (err) {
                    this.reset();
                    callback(err);
                    return;
                }

                localStorage.setItem("spotify_token", JSON.stringify(_.extend(token, {
                    access_token: data.access_token
                })));

                callback(null);
            });
        }
    });

    Spotify.Profiles = function (client) {
        this.client = client;
    };

    _.extend(Spotify.Profiles.prototype, {
        me: function (callback) {
            this.client.request({
                url: "/me"
            }, function (err, data) {
                callback(err, data);
            });
        }
    });

    return Spotify;
}(window);
