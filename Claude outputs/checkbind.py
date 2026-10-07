import re,sys,collections
def binds(s):
    out=[]
    out+=re.findall(r'routerLink(?:Active)?="[^"]*"',s)
    out+=re.findall(r'\[\(?[\w.\-]+\)?\]="[^"]*"',s)
    out+=re.findall(r'\([\w.\-]+\)="[^"]*"',s)
    out+=re.findall(r'#\w+="[^"]*"',s)
    out+=[m.strip() for m in re.findall(r'@(?:if|else if|for|switch|case)\s*\([^{]*\)',s)]
    out+=re.findall(r'@else',s)
    out+=[re.sub(r'\s+',' ',m) for m in re.findall(r'\{\{.*?\}\}',s,re.S)]
    # form control attributes
    for tag in re.findall(r'<(?:input|textarea|button|form|select)\b[^>]*>',s,re.S):
        t=re.sub(r'\s+',' ',tag)
        attrs=re.findall(r'\s((?:id|name|type|required|maxlength|minlength|pattern|autocomplete|inputmode|placeholder|rows)(?:="[^"]*")?)(?=[\s>/])',t)
        out.append('FIELD '+t.split()[0]+' '+' '.join(sorted(attrs)))
    return collections.Counter(out)
ok=True
for base,new in zip(sys.argv[1::2],sys.argv[2::2]):
    b=binds(open(base,encoding='utf-8-sig').read()); n=binds(open(new,encoding='utf-8-sig').read())
    missing=b-n; added=n-b
    print('==',new.split('/')[-1], 'baseline items:',sum(b.values()))
    print('  MISSING:',dict(missing) if missing else 'none')
    print('  ADDED  :',dict(added) if added else 'none')
    if missing: ok=False
print('RESULT', 'PASS' if ok else 'FAIL')
