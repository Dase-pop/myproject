#!/usr/bin/env python3
"""A small concurrent TCP port scanner for systems you are authorized to test."""

import argparse
import concurrent.futures
import errno
import ipaddress
import socket
import sys


def parse_ports(value: str) -> list[int]:
    """Parse comma-separated port numbers and inclusive ranges."""
    ports: set[int] = set()
    for item in value.split(","):
        item = item.strip()
        try:
            if "-" in item:
                start, end = (int(part) for part in item.split("-", 1))
                if start > end:
                    start, end = end, start
                ports.update(range(start, end + 1))
            else:
                ports.add(int(item))
        except ValueError as exc:
            raise argparse.ArgumentTypeError(f"invalid port entry: {item!r}") from exc
    if not ports or any(port < 1 or port > 65535 for port in ports):
        raise argparse.ArgumentTypeError("ports must be between 1 and 65535")
    return sorted(ports)


def targets(value: str, max_hosts: int) -> list[str]:
    """Accept an IP address, CIDR network, or hostname."""
    try:
        network = ipaddress.ip_network(value, strict=False)
        hosts = [str(host) for host in network.hosts()]
        if network.num_addresses == 1:
            hosts = [str(network.network_address)]
        if len(hosts) > max_hosts:
            raise ValueError(f"network has {len(hosts)} hosts; limit is {max_hosts}")
        return hosts
    except ValueError as exc:
        if "/" in value:
            raise argparse.ArgumentTypeError(str(exc)) from exc
    try:
        return sorted({item[4][0] for item in socket.getaddrinfo(value, None)})
    except socket.gaierror as exc:
        raise argparse.ArgumentTypeError(f"cannot resolve {value!r}: {exc}") from exc


def probe(host: str, port: int, timeout: float) -> tuple[str, int] | None:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return host, port
    except (OSError, socket.timeout):
        return None


def probe_udp(host: str, port: int, timeout: float) -> tuple[str, int, str] | None:
    """Send an empty UDP datagram; silence is inconclusive for UDP."""
    try:
        family, socktype, proto, _, address = socket.getaddrinfo(
            host, port, type=socket.SOCK_DGRAM
        )[0]
        with socket.socket(family, socktype, proto) as sock:
            sock.settimeout(timeout)
            sock.connect(address)
            sock.send(b"")
            try:
                sock.recvfrom(1024)
                state = "open"
            except socket.timeout:
                state = "open|filtered"
        return host, port, state
    except OSError as exc:
        if isinstance(exc, ConnectionRefusedError) or getattr(exc, "errno", None) == errno.ECONNREFUSED:
            return host, port, "closed"
        return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Concurrent TCP connect() port scanner")
    parser.add_argument("target", help="hostname, IP address, or CIDR network")
    parser.add_argument("-p", "--ports", type=parse_ports, default=parse_ports("1-1024"),
                        help="ports, e.g. 22,80,443 or 1-1024 (default: 1-1024)")
    parser.add_argument("-t", "--timeout", type=float, default=0.75,
                        help="per-connection timeout in seconds (default: 0.75)")
    parser.add_argument("-w", "--workers", type=int, default=100,
                        help="maximum concurrent connections (default: 100)")
    parser.add_argument("-u", "--udp", action="store_true",
                        help="scan UDP ports instead of TCP")
    parser.add_argument("--max-hosts", type=int, default=256,
                        help="maximum CIDR hosts to scan (default: 256)")
    args = parser.parse_args()

    if args.timeout <= 0 or args.workers < 1 or args.max_hosts < 1:
        parser.error("timeout, workers, and max-hosts must be positive")
    try:
        hosts = targets(args.target, args.max_hosts)
    except argparse.ArgumentTypeError as exc:
        parser.error(str(exc))

    protocol = "udp" if args.udp else "tcp"
    print(f"Scanning {len(hosts)} host(s), {len(args.ports)} {protocol.upper()} port(s)...")
    jobs = ((host, port, args.timeout) for host in hosts for port in args.ports)
    scan = probe_udp if args.udp else probe
    open_ports: list[tuple[str, int, str]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        for result in executor.map(lambda job: scan(*job), jobs):
            if result:
                if args.udp:
                    open_ports.append(result)
                else:
                    open_ports.append((result[0], result[1], "open"))

    for host, port, state in sorted(open_ports, key=lambda item: (ipaddress.ip_address(item[0]), item[1])):
        try:
            service = socket.getservbyport(port, protocol)
        except OSError:
            service = "unknown"
        print(f"{host:>15}  {port:>5}/{protocol}  {state:<13} ({service})")
    print(f"Done. Found {len(open_ports)} responsive {protocol} port(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
