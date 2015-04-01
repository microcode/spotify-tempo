Template = {};

Template._sources = config.Templates;

Template._templates = {};
Template._missing = _.template('<b>MISSING TEMPLATE</b>');

Template.preload = function (callback) {
    async.each(Template._sources, function (source, callback) {
        $.ajax({
            url: "app/templates/" + source + ".html",
            dataType: 'html'
        }).done(function (data) {
            Template._templates[source] = _.template(data);
        }).always(function () {
            callback();
        });
    }, callback);
};

Template.get = function (name) {
    var t = Template._templates[name];
    return t ? t : Template._missing;
};