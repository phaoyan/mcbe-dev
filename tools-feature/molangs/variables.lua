t.origin_dist= math.abs(v.worldx) + math.abs(v.worldz);
t.height_map = q.heightmap(v.worldx, v.worldz);
t.roffx = 13122;
t.roffz = 15958;
t.noise_sel = 0.99;
t.noise_1 = q.noise(v.originx, v.originz);
t.noise_2 = q.noise(v.originx + t.roffx, v.originz + t.roffz);
t.selection = t.noise_1 > t.noise_sel && t.noise_2 > t.noise_sel;
return t.selection;