import test from 'node:test';
import assert from 'node:assert/strict';
import {locations,navigationUrl,progress} from '../locations.js';
test('all 24 supplied points have unique identities and valid Krasnoyarsk coordinates',()=>{
 assert.equal(locations.length,24);assert.equal(new Set(locations.map(p=>p.name)).size,24);assert.equal(new Set(locations.map(p=>p.id)).size,24);
 for(const p of locations){assert.ok(p.lat>55.9&&p.lat<56.2);assert.ok(p.lon>92.7&&p.lon<93)}
});
test('navigation preserves longitude/latitude order and supplied precision',()=>{
 assert.equal(new URL(navigationUrl(locations[0])).searchParams.get('pt'),'92.875694,56.011673');
 assert.equal(new URL(navigationUrl(locations[23])).searchParams.get('pt'),'92.919179,56.116907');
});
test('progress reaches the finale only after the collection is complete',()=>{assert.equal(progress(0,24),0);assert.equal(progress(5,24),21);assert.equal(progress(23,24),96);assert.equal(progress(24,24),100)});
