TracksView = SpotifyTempo.View.extend({
    initialize: function (options) {
        this.spotify = options.spotify;
        this.player = options.player;

        this.bpm = options.bpm;
        this.listenTo(this.bpm, 'update', this.update);

        this.template = Template.get("tracks");

        this.collection = new Backbone.Collection();
        this.listenTo(this.collection, 'reset', this.addAll);

        if (options.playlist) {
            this.showPlaylist(options.playlist);
        }
    },

    render: function () {
        this.$el.html(this.template());
        var root = this.$el.find("tbody");
        _.each(this.getChildViews(), function (view) {
            root.append(view.render().el);
        });
        this.update();
        return this;
    },

    update: function () {
        if (!this.playlist) {
            return;
        }

        var min = Number.MAX_VALUE, max = Number.MIN_VALUE;
        var data = this.bpm.query(this.playlist.id);
        _.each(this.getChildViews(), function (view) {
            var entry = view.model.toJSON();
            var track = entry.track.id;
            var bpm = data[track];
            view.bpm = bpm;
            view.render();

            if (!entry.is_local && !!entry.track.preview_url && bpm > 0) {
                min = Math.min(bpm, min);
                max = Math.max(bpm, max);
            }
        });

        if (min < max) {
            this.player.setRange(min, max);
        }
    },

    showPlaylist: function (playlist) {
        this.playlist = playlist;

        this.spotify.Playlists.tracks(playlist.owner, playlist.id, _.bind(function (err, tracks) {
            if (err) {
                return;
            }

            this.collection.reset(tracks);
            this.addAll();
        }, this));
    },

    showRange: function (min, max) {
        console.log("showRange", min, max);
        _.each(this.getChildViews(), function (view) {
            view.$el.toggle(view.bpm >= min && view.bpm <= max);
        });
    },

    addAll: function () {
        var tracks = this.collection.map(function (model) {
            return model.get("track").id;
        });
        this.bpm.add(this.playlist.id, tracks);

        this.closeChildViews();
        this.collection.each(this.addOne, this);
        this.render();
    },

    addOne: function (model) {
        var view = new TracksItemView({ model: model, player: this.player });
        this.addChildView(view);
    },

    playRandomTrack: function () {
        var items = _.chain(this.getChildViews()).map(function (view) {
            return view.$el.is(":visible") ? view.model.toJSON() : null;
        }).filter(function (entry) {
            return entry ? !entry.is_local && !!entry.track.preview_url : false;
        }).value();

        var index = Math.floor(Math.random() * items.length);
        var item = items[index];

        this.player.setActiveTrack(item.track);
    }
});

TracksItemView = SpotifyTempo.View.extend({
    tagName: 'tr',

    initialize: function (options) {
        this.player = options.player;
        this.template = Template.get("tracks-item");
    },

    events: {
        "click": "playTrack"
    },

    render: function () {
        var entry = this.model.toJSON();
        this.$el.html(this.template(entry));
        this.$el.toggleClass('text-muted', !entry.track.preview_url);
        return this;
    },

    toTime: function (ms) {
        var result = "";

        var hours = Math.floor(ms / (60 * 60 * 1000));
        if (hours > 0) {
            result += hours.toString() + ":";
        }

        var minutes = Math.floor(ms / ( 60 * 1000)) % 60;
        result += ("0" + minutes.toString()).slice(-2);

        var seconds = Math.floor(ms / 1000) % 60;
        result += ":" + ("0" + seconds.toString()).slice(-2);

        return result;
    },

    playTrack: function () {
        var track = this.model.toJSON().track;
        if (!track.preview_url) {
            return;
        }

        this.player.setActiveTrack(this.model.toJSON().track);
    }
});
