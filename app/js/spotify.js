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
        initialize: function (options) {
            this.options = _.defaults(_.clone(options), {
                endpoints: {
                    "accounts": "https://accounts.spotify.com",
                    "api": "https://api.spotify.com/v1"
                }
            });

            this.Playlists = new Spotify.Playlists(this);
            this.Authorization = new Spotify.Authorization(this);
            this.Profiles = new Spotify.Profiles(this);
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
                    return _.map(value, function (v) {
                        return { name: key, value: v };
                    });
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

        getParam: function (name) {
            name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
            var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
            var results = regex.exec(window.location.search);
            return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
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

            var code = this.getParam("code");
            if (code) {
                this.Authorization.code(code, _.bind(function (err) {
                }, this));
                return;
            }

            callback(null, null);
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

    Spotify.Authorization = function (client) {
        this.client = client;
    };

    _.extend(Spotify.Authorization.prototype, {
        getAccessToken: function () {
            return root.localStorage["access_token"];
        },

        reset: function () {
            root.localStorage.removeItem("access_token");
            root.localStorage.removeItem("refresh_token");
        },

        authorize: function (scopes) {
            var url = this.client.options.endpoints[Spotify.Endpoint.ACCOUNTS] + "/authorize?";

            url += $.param({
                client_id: this.client.options.client_id,
                response_type: "code",
                redirect_uri: this.client.options.redirect_uri,
                scope: scopes.join(" ")
            });

            window.location = url;
        },

        code: function (code, callback) {
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

                root.localStorage["access_token"] = data.access_token;
                root.localStorage["refresh_token"] = data.refresh_token;

                callback(null);
            });
        },

        refresh: function (callback) {
            var refreshToken = root.localStorage["refresh_token"];
            if (!refreshToken) {
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
                    refresh_token: refreshToken
                }
            }, function (err, data) {
                if (err) {
                    this.reset();
                    callback(err);
                    return;
                }

                root.localStorage["access_token"] = data.access_token;
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
