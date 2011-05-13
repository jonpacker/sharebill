function() {
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

            $("table#recent tbody>tr").append($('<td class="credits"></td>'));
            $("table#recent tbody>tr").each(function() { $(this).children("td.credits").first().before($('<td class="debets"></td>')) });

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

    var timestamp = function (date) {
        var pad = function (amount, width) {
            var str = amount.toString();
            while (str.length < width) str = "0" + str;
            return str;
        };

        date = date ? date : new Date();
        return (
            pad(date.getUTCFullYear(), 4) + "-" +
            pad(date.getUTCMonth() + 1, 2) + "-" +
            pad(date.getUTCDate(), 2) + "T" +
            pad(date.getUTCHours(), 2) + ":" +
            pad(date.getUTCMinutes(), 2) + ":" +
            pad(date.getUTCSeconds(), 2) + "." +
            pad(date.getUTCMilliseconds(), 3) + "Z"
        );
    };

    var today = new Date();
    today.setUTCHours(0);
    today.setUTCMinutes(0);
    today.setUTCSeconds(0);
    today.setUTCMilliseconds(0);

    var daysAgo = today;
    daysAgo.setUTCDate(today.getUTCDate() - 3);

    var startKey = timestamp(daysAgo);

    return {
        "table#recent>tbody": {
            "_changes": {
                "query": {
                    view: "all",
                    type: "newRows",
                    descending: true,
                    endkey: startKey
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
                    r.append($("<td></td>").text(v.meta.description));
                    for (var i = 0; i < users; ++i) {
                        r.append($('<td class="debets"></td>').text(lists.debets[i] || ""));
                    }
                    for (var i = 0; i < users; ++i) {
                        r.append($('<td class="credits"></td>').text(lists.credits[i] || ""));
                    }
                    $("table#recent>tbody").append(r);
                }
            }
        }
    };
}