#!/usr/bin/env python3
from pathlib import Path
import json,sys
R=Path(__file__).resolve().parents[1]
reg=json.loads((R/'registries/skill-registry.json').read_text(encoding='utf-8'))
err=[];seen=set()
for x in reg['skills']:
 s=x['skill_id']
 if s in seen:err.append('duplicate '+s)
 seen.add(s)
 p=R/x['path'];c=p.parent/'contract.json'
 if not p.exists():err.append('missing '+str(p))
 if not c.exists():err.append('missing '+str(c));continue
 d=json.loads(c.read_text(encoding='utf-8'))
 if d.get('skill_id')!=s:err.append('mismatch '+s)
 if not d.get('prohibited_uses'):err.append('no prohibited '+s)
 if 'human_review' not in d:err.append('no human review '+s)
print('VALIDATION PASSED' if not err else 'VALIDATION FAILED')
for e in err:print('-',e)
print('Skills:',len(reg['skills']))
sys.exit(1 if err else 0)
