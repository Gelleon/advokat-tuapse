import React from 'react';
import { Scale, Heart, MapPin, TrendingDown, UserCheck, Gavel } from 'lucide-react';

const Services = () => {
  const services = [
    {
      icon: Gavel,
      title: 'Уголовные дела',
      description: 'Профессиональная защита прав и интересов в уголовном процессе на всех стадиях',
      features: ['Предварительное следствие и дознание', 'Судебное разбирательство во всех инстанциях', 'Обжалование действий правоохранительных органов', 'Защита прав потерпевших']
    },
    {
      icon: Heart,
      title: 'Семейные споры',
      description: 'Деликатное решение семейных споров с учетом интересов доверителя',
      features: ['Раздел совместно нажитого имущества', 'Взыскание и изменение алиментов', 'Защита прав супруга при банкротстве', 'Брачные договоры']
    },
    {
      icon: MapPin,
      title: 'Земельные споры',
      description: 'Защита прав на земельные участки и разрешение земельных споров',
      features: ['Споры об установлении границ', 'Споры о праве собственности, аренды', 'Исправление кадастровой ошибки', 'Узаконивание самовольных строений']
    },
    {
      icon: TrendingDown,
      title: 'Банкротство',
      description: 'Комплексное сопровождение процедур банкротства',
      features: ['Банкротство физических лиц', 'Банкротство юридических лиц', 'Защита имущественных прав при банкротстве', 'Списание долгов']
    },
    {
      icon: Scale,
      title: 'Арбитражные дела',
      description: 'Профессиональное представительство в арбитражных судах всех инстанций',
      features: ['Экономические споры', 'Корпоративные споры', 'Налоговые споры', 'Исполнительное производство']
    },
    {
      icon: UserCheck,
      title: 'Наследственные споры',
      description: 'Защита прав наследников',
      features: ['Восстановление срока принятия наследства', 'Установление факта родства', 'Изменение наследственной массы', 'Споры о праве собственности на наследство']
    }
  ];

  return (
    <section id="services" className="py-32 bg-surface">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6">
              Специализация
            </h2>
            <p className="text-lg text-primary/70 leading-relaxed font-light">
              Мы предоставляем комплексные правовые решения, опираясь на глубокую экспертизу и многолетнюю практику в ключевых отраслях права.
            </p>
          </div>
          <div className="hidden md:block w-24 h-px bg-secondary"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {services.map((service, index) => (
            <div 
              key={index}
              className="group border-t border-primary/10 pt-8 transition-colors duration-300 hover:border-secondary"
            >
              <div className="mb-6 text-secondary">
                <service.icon className="w-10 h-10" strokeWidth={1} />
              </div>

              <h3 className="text-2xl font-serif font-bold text-primary mb-4">
                {service.title}
              </h3>
              
              <p className="text-primary/70 mb-8 leading-relaxed font-light">
                {service.description}
              </p>

              <ul className="space-y-3">
                {service.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <span className="text-secondary mr-3 mt-1.5 text-xs">◆</span>
                    <span className="text-primary/80 text-sm leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;