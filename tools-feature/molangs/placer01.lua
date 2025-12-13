t.height_a = q.heightmap(v.originx, v.originz);
t.height_b = q.heightmap(v.originx + 32, v.originz);
t.height_c = q.heightmap(v.originx, v.originz - 32);
t.height_d = q.heightmap(v.originx + 32, v.originz - 32);

t.noise_mean = (t.height_a + t.height_b + t.height_c + t.height_d) / 4;
t.noise_variance = 
(t.height_a - t.noise_mean) * (t.height_a - t.noise_mean) +
(t.height_b - t.noise_mean) * (t.height_b - t.noise_mean) +
(t.height_c - t.noise_mean) * (t.height_c - t.noise_mean) +
(t.height_d - t.noise_mean) * (t.height_d - t.noise_mean);
t.noise_variance = t.noise_variance * 0.25;
t.noise_filter = t.noise_variance < t.noise_filter_threshold * t.noise_filter_threshold;
return t.noise_filter && t.selection01;