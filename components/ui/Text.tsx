interface Props {
  children: React.ReactNode;
}

export default function Text({
  children,
}: Props) {
  return (
    <p className="leading-8 text-slate-600">
      {children}
    </p>
  );
}