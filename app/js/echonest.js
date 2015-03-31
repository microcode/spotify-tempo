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
            this.options = options;
            this.TasteProfile = new EchoNest.TasteProfile(this);
        },

        request: function (request, callback) {
            var url = "//developer.echonest.com/api/v4" + request.url + "?";

            // TODO: handle paged requests

            var data;
            switch (request.method) {
                default: case EchoNest.Request.GET: {
                    var params = _.compact(_.flatten(_.map(_.extend({
                        api_key: this.options.api_key
                    }, request.params), function (value, key) {
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

                    url += $.param(params);
                } break;

                case EchoNest.Request.POST: {
                    url += $.param({
                        api_key: this.options.api_key
                    });

                    data = new FormData();
                    _.each(request.params, function (value, key) {
                        data.append(key, value);
                    });
                } break;
            }

            console.log("REQUEST", url);

            $.ajax(url, {
                method: request.method,
                contentType: false,
                data: data,
                cache: false,
                processData: false
            }).fail(_.bind(function (jqXHR, textStatus, errorThrown) {
                switch (jqXHR.status) {
                    case "429": {
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
                    } break;

                    default: {
                        callback(textStatus);
                    } break;
                }
            }, this)).done(function (data) {
                callback(null, data);
            });
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
                params: {
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
                params: {
                    id: id
                }
            }, callback);
        },

        update: function (id, data, callback) {
            this.client.request({
                method: EchoNest.Request.POST,
                url: "/tasteprofile/update",
                params: {
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
                method: EchoNest.Request.GET,
                url: "/tasteprofile/status",
                params: {
                    ticket: ticket
                }
            }, function (err, data) {
                console.log("STATUS", err, data);

                if (err) {
                    callback(err);
                    return;
                }

                callback(null, data.response.ticket_status, data.response.details);
            })
        },

        list: function (callback) {
            this.client.request({
                method: EchoNest.Request.GET,
                url: "/tasteprofile/list",
                paged: true
            }, function (err, data) {
                if (err) {
                    callback(err);
                    return;
                }

                callback(null, data.response.catalogs);
            });
        },

        read: function (id, options, callback) {
            this.client.request({
                method: EchoNest.Request.GET,
                url: "/tasteprofile/read",
                params: {
                    id: id,
                    item_id: options.item_id,
                    bucket: options.buckets
                }
            }, function (err, data) {
                console.log("READ", err, data);

                if (err) {
                    callback(err);
                    return;
                }
            });
        }
    });

    return EchoNest;
}(window);
