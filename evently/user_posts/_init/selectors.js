function () {
	var dataFunctionString = $$(this).evently._init.data;
	var dataFunction = eval("(" + dataFunctionString + ")");
	var data = dataFunction();

	var column_map = {}, users = 0;

    var get_column = function(id) {
        if (!(id in column_map)) {
            column_map[id] = users++;
            var h = $("<th></th>")
            h.text(id);
            $("#user_headers").append(h);
            $("#user_headers")
                .children(":nth-child(" + users + ")")
                    .before(h.clone());

            $("table#posts tbody>tr").append($('<td class="credits currency"></td>'));
            $("table#posts tbody>tr").each(function() { $(this).children("td.credits").first().before($('<td class="debets currency"></td>')) });

            $(".user_super_header").attr("colspan", users);
        }
        return column_map[id];
    };

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var format_timestamp = function(timestamp) {
        var month = parseInt(timestamp.substr(5, 2), 10);
        var day = parseInt(timestamp.substr(8, 2), 10);

        return months[month - 1] + " " + day;
    };

    return {
        "table#posts>tbody": {
            "_changes": {
                "query": {
                    view: "user",
                    type: "newRows",
                    descending: true,
                    startkey: [data.user, {}],
                    endkey: [data.user]
                },
                "after": function(row) {
                    var v = row.value;
                    var lists = {"credits": [], "debets": []};
                    for (var type in lists) {
                        for (var user in v.transaction[type]) {
                            var col = get_column(user);
                            lists[type][col] = v.transaction[type][user];
                        }
                    }

                    var r = $("<tr></tr>");
                    r.append($("<td></td>").text(format_timestamp(v.meta.timestamp)));
                    r.append($("<td></td>").append($("<a></a>").attr("href", "_show/freeform/" + v._id).text(v.meta.description)));
                    for (var i = 0; i < users; ++i) {
                        r.append($('<td class="debets currency"></td>').text(sharebill.formatCurrencyShortOrEmpty(lists.debets[i])));
                    }
                    for (var i = 0; i < users; ++i) {
                        r.append($('<td class="credits currency"></td>').text(sharebill.formatCurrencyShortOrEmpty(lists.credits[i])));
                    }
                    $("table#posts>tbody>#totals").before(r);
                }
            }
        }
    };
}
