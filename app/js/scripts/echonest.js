EchoNest = function (root) {
    var EchoNest = function () {
        this.initialize.apply(this, arguments);
    };

    _.extend(EchoNest, {
        Request: {
            GET: "GET",
            POST: "POST"
        }
    });

    _.extend(EchoNest.prototype, {
        initialize: function (options) {
            this.options = {
                endpoint: "//developer.echonest.com"
            };
            this.TasteProfile = new EchoNest.TasteProfile(this);
        },

        setup: function (options) {
            this.options = _.extend(this.options, options);
        },

        request: function (request, callback) {
            request = _.defaults(_.clone(request), {
                method: EchoNest.Request.GET,
                paged: false,
                start: 0,
                results: 30,
                query: {},
                data: {},
                output: []
            });

            var url = this.options.endpoint + "/api/v4" + request.url;

            var query = _.clone(request.query);
            query["api_key"] = this.options.api_key;
            if (request.paged) {
                query["start"] = request.start;
                query["results"] = request.results;
            }

            var params = _.compact(_.flatten(_.map(query, function (value, key) {
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

            var data;
            if (request.method == EchoNest.Request.POST) {
                data = new FormData();
                _.each(request.data, function (value, key) {
                    data.append(key, value);
                });
            }

            $.ajax(url, {
                method: request.method,
                contentType: false,
                data: data,
                cache: false,
                processData: false
            }).fail(_.bind(function (jqXHR, textStatus, errorThrown) {
                if (jqXHR.status != 429) {
                    callback(textStatus);
                    return;
                }

                var retries = request.hasOwnProperty("_retries") ? request._retries : 0;

                if (retries >= 2) {
                    callback(textStatus);
                    return;
                }

                setTimeout(_.bind(function () {
                    var _request = _.extend(_.cloneDeep(request), {
                        _retries: retries + 1
                    });

                    this.request(_request, callback);
                }, this), (retries + 1) * 2500 + Math.random() * 2500);
            }, this)).done(_.bind(function (data) {
                if (!request.paged) {
                    callback(null, data);
                    return;
                }

                var page = data.response[request.paged];

                request.output.push.apply(request.output, page.items);

                if (page.start + request.results < page.total) {
                    var newRequest = _.extend(_.clone(request), {
                        start: request.start + request.results
                    });

                    this.request(newRequest, callback);
                } else {
                    callback(null, request.output);
                }
            }, this));
        }
    });

    EchoNest.TasteProfile = function (client) {
        this.client = client;
    };

    _.extend(EchoNest.TasteProfile, {
        ARTIST: "artist",
        SONG: "song",
        GENERAL: "general"
    });

    _.extend(EchoNest.TasteProfile.prototype, {
        create: function (name, type, callback) {
            this.client.request({
                method: EchoNest.Request.POST,
                url: "/tasteprofile/create",
                data: {
                    name: name,
                    type: type
                }
            }, function (err, data) {
                if (err) {
                    callback(err);
                    return;
                }

                callback(null, {
                    id: data.response.id,
                    name: data.response.name,
                    type: data.response.type
                })
            });
        },

        destroy: function (id, callback) {
            this.client.request({
                method: EchoNest.Request.POST,
                url: "/tasteprofile/delete",
                data: {
                    id: id
                }
            }, callback);
        },

        update: function (id, data, callback) {
            this.client.request({
                method: EchoNest.Request.POST,
                url: "/tasteprofile/update",
                data: {
                    id: id,
                    data: JSON.stringify(data)
                }
            }, function (err, data) {
                if (err) {
                    callback(err);
                    return;
                }

                callback(null, data.response.ticket);
            });
        },

        status: function (ticket, callback) {
            this.client.request({
                url: "/tasteprofile/status",
                query: {
                    ticket: ticket
                }
            }, function (err, data) {
                if (err) {
                    callback(err);
                    return;
                }

                callback(null, data.response.ticket_status, data.response.details);
            })
        },

        list: function (callback) {
            this.client.request({
                url: "/tasteprofile/list",
                paged: "catalogs"
            }, function (err, data) {
                if (err) {
                    callback(err);
                    return;
                }

                callback(null, data.response);
            });
        },

        read: function (id, options, callback) {
            this.client.request({
                url: "/tasteprofile/read",
                query: {
                    id: id,
                    item_id: options.item_id,
                    bucket: options.buckets
                },
                paged: "catalog",
                results: 1000
            }, function (err, data) {
                if (err) {
                    callback(err);
                    return;
                }

                callback(null, data);
            });
        }
    });

    return EchoNest;
}(window);
