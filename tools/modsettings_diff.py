"""Read-only diff of two Factorio 2.0 mod-settings.dat files (startup/runtime-global/runtime-per-user).
Usage: python -I tools/modsettings_diff.py A.dat B.dat"""
import struct, sys


def load(path):
    b = open(path, 'rb').read()
    pos = [8 + 1]  # version (4 x u16) + reserved byte

    def u8():
        v = b[pos[0]]; pos[0] += 1; return v

    def u32():
        v = struct.unpack_from('<I', b, pos[0])[0]; pos[0] += 4; return v

    def string():
        if u8():
            return ''
        n = u8()
        if n == 255:
            n = u32()
        s = b[pos[0]:pos[0] + n].decode('utf-8', 'replace'); pos[0] += n; return s

    def tree():
        t = u8(); u8()
        if t == 0:
            return None
        if t == 1:
            return bool(u8())
        if t == 2:
            v = struct.unpack_from('<d', b, pos[0])[0]; pos[0] += 8; return v
        if t == 3:
            return string()
        if t in (4, 5):
            n = u32(); d = {}
            for i in range(n):
                k = string(); d[k if t == 5 else i] = tree()
            return d
        if t in (6, 7):  # signed / unsigned 64-bit integers
            v = struct.unpack_from('<q' if t == 6 else '<Q', b, pos[0])[0]; pos[0] += 8; return v
        raise ValueError('type %d at %d' % (t, pos[0]))
    return tree()


a, c = load(sys.argv[1]), load(sys.argv[2])
for scope in sorted(set(a) | set(c)):
    A, C = a.get(scope, {}), c.get(scope, {})
    for k in sorted(set(A) | set(C)):
        va, vc = (A.get(k) or {}).get('value'), (C.get(k) or {}).get('value')
        if va != vc:
            print(scope, k, va, '->', vc)
