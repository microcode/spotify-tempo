var AppRouter = SpotifyTempo.Router.extend({
    initialize: function () {
        this.header = new HeaderView();
        $("#header").html(this.header.render().el);
    },

    routes: {
        "": "showRoot",
        "echonest": "showEchoNestSettings",
        "spotify": "showSpotifySettings",
        "playlists/:owner/:playlist": "showPlaylist"
    },

    showRoot: function () {
        this.showView("#body", new RootView());
    },

    showPlaylist: function (owner, id) {
        var playlist;
        if (owner && id) {
            playlist = {
                owner: owner,
                id: id
            };
        }

        if (this.isViewType(RootView)) {
            this.getCurrentView().showPlaylist(playlist);
            return;
        }

        this.showView("#body", new RootView({ playlist: playlist }));
    },

    showEchoNestSettings: function () {
        this.showView("#body", new EchoNestSettingsView());
    },

    showSpotifySettings: function () {
        this.showView("#body", new SpotifySettingsView());
    }
});

var app;
async.parallel([
    Template.preload
], function (err) {
    app = new AppRouter();

    if (!Backbone.History.started) {
        Backbone.history.start();
    }
});

