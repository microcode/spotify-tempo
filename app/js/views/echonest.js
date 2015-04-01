EchoNestSettingsView = SpotifyTempo.View.extend({
    className: "container well",

    initialize: function () {
        this.template = Template.get("echonest");

        this.settings = _.defaults(JSON.parse(localStorage.getItem("echonest_settings")) || {}, {
            api_key: ""
        });
    },

    events: {
        "submit form": "save",
        "click #test": "test"
    },

    render: function () {
        this.$el.html(this.template(this.settings));
        return this;
    },

    save: function (event) {
        event.preventDefault();

        this.settings = {
            api_key: this.$el.find("#api_key").val()
        };

        localStorage.setItem("echonest_settings", JSON.stringify(this.settings));
    },

    test: function () {
        var client = new EchoNest();
        client.setup(this.settings);
        client.TasteProfile.list(function (err, profiles) {
            if (err) {
                alert("Error while testing: " + err);
                return;
            }

            alert("Successful test.");
        });
    }
});
