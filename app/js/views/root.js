RootView = SpotifyTempo.View.extend({
    id: "root",
    className: "container",

    initialize: function (options) {
        if (options) {
            this.playlist = options.playlist;
        }
        this.template = Template.get("root");

        this.active = true;
        async.parallel([
            _.bind(this.createSpotify, this),
        ], _.bind(this.create, this))
    },

    onClose: function () {
        delete this.active;
    },

    create: function () {
        if (!this.active) {
            return;
        }

        this._ready = true;
        this.render();

        if (this.isReady())
        {
            this.bpm = new BpmCache({ spotify: this.spotify });

            this.player = new PlayerView();
            this.addChildView(this.player);
            this.$el.find("#player").html(this.player.render().el);

            this.playlists = new PlaylistView({ spotify: this.spotify });
            this.addChildView(this.playlists);
            this.$el.find("#playlists").html(this.playlists.render().el);

            this.tracks = new TracksView({ spotify: this.spotify, playlist: this.playlist, player: this.player, bpm: this.bpm });
            this.addChildView(this.tracks);
            this.$el.find("#tracks-inner").html(this.tracks.render().el);

            // TODO: remove this hack
            this.player.tracks = this.tracks;
        }
    },

    render: function () {
        this.$el.html(this.template());
        return this;
    },

    createSpotify: function (callback) {
        var config = JSON.parse(localStorage.getItem("spotify_settings"));
        if (!config) {
            async.nextTick(callback);
            return;
        }

        var spotify = new Spotify();
        spotify.setup(config);

        spotify.connect(_.bind(function (err) {
            if (!err) {
                this.spotify = spotify;
            }
            callback(null);
        }, this));
    },

    isReady: function () {
        if (!this._ready) {
            return false;
        }

        if (!this.spotify) {
            return "spotify";
        }

        return true;
    },

    showPlaylist: function (id) {
        this.playlist = id;
        if (!this.isReady()) {
            return;
        }

        if (this.tracks) {
            this.tracks.showPlaylist(id);
        }
    }
});
