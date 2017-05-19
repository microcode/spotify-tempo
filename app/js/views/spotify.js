SpotifySettingsView = SpotifyTempo.View.extend({
    className: "container well",

    initialize: function (options) {
        this.options = options;
        this.template = Template.get("spotify");

        this.settings = _.defaults(JSON.parse(localStorage.getItem("spotify_settings")) || {}, {
            client_id: "",
            client_secret: "",
            redirect_uri: ""
        });

        var access_token = this.getParam("access_token");
        if (access_token && this.settings.client_id) {
            var client = new Spotify();

            client.setup(this.settings);
            client.setAccessToken(access_token);
        }
    },

    events: {
        "submit form": "save",
        "click #authorize": "authorize",
        "click #test": "test"
    },

    render: function () {
        this.$el.html(this.template(this.settings));
        return this;
    },

    save: function (event) {
        event.preventDefault();

        this.settings = {
            client_id: this.$el.find("#client_id").val(),
            client_secret: this.$el.find("#client_secret").val(),
            redirect_uri: this.$el.find("#redirect_uri").val()
        };

        localStorage.setItem("spotify_settings", JSON.stringify(this.settings));
        location.reload();
    },

    authorize: function () {
        var client = new Spotify();

        client.setup(this.settings);
        client.Authorization.authorize(["playlist-read-private"]);
    },

    test: function () {
        var client = new Spotify();
        client.setup(this.settings)

        client.connect(function (err) {
            if (err) {
                alert("Error while testing: " + err);
                return;
            }

            alert("Successful test, signed in as: " + client.user.display_name);
        });
    },

    getParam: function getParam(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
        var results = regex.exec(window.location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }
});
