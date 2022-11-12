obs = obslua
proxy_port = "8080"

function script_properties()
	local props = obs.obs_properties_create()

	local p = obs.obs_properties_add_list(props, "proxy_port", "listening proxy port", obs.OBS_COMBO_TYPE_EDITABLE, obs.OBS_COMBO_FORMAT_STRING)

	return props
end

function script_description()
	return "Adds reverse proxy listening on localhost port"
end

function script_update(settings)
	proxy_port = obs.obs_data_get_string(settings, "proxy_port")
end

function script_load(settings)
	os.execute('/Applications/Proxy.app/Contents/MacOS/proxy-darwin-amd64 -d')
end

function script_unload(settings)
	os.execute('pkill proxy-darwin-amd64')
end
