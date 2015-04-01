var AppRouter = SpotifyTempo.Router.extend({
    initialize: function () {
        this.header = new HeaderView();
        $("#header").html(this.header.render().el);
    },

    routes: {
        "": "showRoot",
        "echonest": "showEchoNestSettings",
        "spotify": "showSpotifySettings"
    },

    showRoot: function () {
        this.showView("#body", new RootView());
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

